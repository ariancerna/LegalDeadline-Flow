package pe.edu.utp.legaldeadlineflow.config;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.utp.legaldeadlineflow.config.GeneradorCartera.Cartera;
import pe.edu.utp.legaldeadlineflow.config.GeneradorCartera.FilaEvento;
import pe.edu.utp.legaldeadlineflow.config.GeneradorCartera.FilaExpediente;
import pe.edu.utp.legaldeadlineflow.config.GeneradorCartera.FilaPlazo;
import pe.edu.utp.legaldeadlineflow.config.GeneradorCartera.FilaTarea;

/**
 * Completa la demostración hasta {@code legaldeadline.demo.volumen} expedientes (por defecto 5000 con el
 * perfil {@code demo}) para presentar el sistema y medir la búsqueda con un volumen realista (RF04, RNF05).
 *
 * <p>Se ejecuta después de {@link DemoDataSeeder}. Si la base ya tiene esa cantidad de expedientes no hace
 * nada, así que reiniciar el backend no duplica datos. Todo se inserta en una sola transacción: si algo
 * falla, la base queda como estaba. Usa inserciones por lotes para tardar segundos y no minutos en un
 * servidor pequeño.
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "legaldeadline.demo.enabled", havingValue = "true")
public class CarteraVolumenSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(CarteraVolumenSeeder.class);
    static final long SEMILLA = 20261028L;
    static final int RESPONSABLES_ADICIONALES = 36;
    private static final String PASSWORD_RESPONSABLE = "ResponsableDemo123!";
    private static final int LOTE = 1000;

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaccion;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final int objetivo;
    private final int umbral;

    public CarteraVolumenSeeder(JdbcTemplate jdbc, PlatformTransactionManager transactionManager,
                                PasswordEncoder encoder, Clock clock,
                                @Value("${legaldeadline.demo.volumen:0}") int objetivo,
                                @Value("${legaldeadline.carga.umbral:5}") int umbral) {
        this.jdbc = jdbc;
        this.transaccion = new TransactionTemplate(transactionManager);
        this.encoder = encoder;
        this.clock = clock;
        this.objetivo = objetivo;
        this.umbral = umbral;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        if (objetivo <= 0) return;
        long existentes = contar("select count(*) from expedientes");
        if (existentes >= objetivo) return;
        int faltantes = (int) (objetivo - existentes);
        log.info("Generando la cartera de demostración: {} expedientes nuevos hasta llegar a {}", faltantes, objetivo);
        long inicio = System.nanoTime();
        Cartera cartera = transaccion.execute(estado -> cargar(faltantes));
        log.info("Cartera de demostración lista en {} s: {} expedientes, {} tareas, {} plazos y {} eventos nuevos",
                (System.nanoTime() - inicio) / 1_000_000_000L, cartera.expedientes().size(), cartera.tareas().size(),
                cartera.plazos().size(), cartera.eventos().size());
    }

    private Cartera cargar(int cantidad) {
        crearResponsables();
        List<Long> responsables = jdbc.queryForList(
                "select id from usuarios where rol = 'RESPONSABLE' and activo = true order by id", Long.class);
        List<Long> gestores = jdbc.queryForList(
                "select id from usuarios where rol in ('ADMINISTRADOR', 'SUPERVISOR') and activo = true order by id", Long.class);
        Map<Long, Long> carga = new HashMap<>();
        jdbc.query("select responsable_id, count(*) from tareas where estado in ('PENDIENTE', 'EN_PROGRESO') "
                + "group by responsable_id", rs -> { carga.put(rs.getLong(1), rs.getLong(2)); });
        Set<Long> conCargaAlta = new HashSet<>();
        for (int i = 4; i < responsables.size(); i += 8) conCargaAlta.add(responsables.get(i));

        Instant ahora = clock.instant();
        LocalDate hoy = LocalDate.now(clock);
        Cartera cartera = GeneradorCartera.generar(new GeneradorCartera.Parametros(cantidad, SEMILLA, ahora, hoy,
                clock.getZone(), responsables, carga, conCargaAlta, gestores,
                new HashSet<>(jdbc.queryForList("select codigo from expedientes", String.class)), umbral,
                siguienteId("expedientes"), siguienteId("tareas"), siguienteId("plazos")));

        insertar("insert into expedientes (id, codigo, asunto, responsable_id, estado, creado_en, actualizado_en, version) "
                + "values (?, ?, ?, ?, ?, ?, ?, 0)", cartera.expedientes(), (FilaExpediente e) -> new Object[] {
                e.id(), e.codigo(), e.asunto(), e.responsableId(), e.estado().name(), fecha(e.creadoEn()),
                fecha(e.actualizadoEn())});
        insertar("insert into tareas (id, expediente_id, titulo, titulo_normalizado, tipo, responsable_id, prioridad, "
                + "fecha_limite, estado, creado_en, actualizado_en, version) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                cartera.tareas(), (FilaTarea t) -> new Object[] {
                t.id(), t.expedienteId(), t.titulo(), t.titulo().toUpperCase(Locale.ROOT), t.tipo(), t.responsableId(),
                t.prioridad().name(), t.fechaLimite(), t.estado().name(), fecha(t.creadoEn()), fecha(t.actualizadoEn())});
        insertar("insert into plazos (id, expediente_id, tipo, fecha_limite, estado, motivo_anulacion, creado_en, "
                + "actualizado_en, anulado_en, version) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
                cartera.plazos(), (FilaPlazo p) -> new Object[] {
                p.id(), p.expedienteId(), p.tipo(), p.fechaLimite(), p.estado().name(), p.motivoAnulacion(),
                fecha(p.creadoEn()), fecha(p.actualizadoEn()), fecha(p.anuladoEn())});
        insertar("insert into eventos (tipo, recurso, recurso_id, detalle, fecha, usuario_id) values (?, ?, ?, ?, ?, ?)",
                cartera.eventos(), (FilaEvento e) -> new Object[] {
                e.tipo().name(), e.recurso(), e.recursoId(), e.detalle(), fecha(e.fecha()), e.usuarioId()});

        // Los ids se asignaron aquí; la identidad debe continuar después del último para los registros nuevos.
        for (String tabla : List.of("expedientes", "tareas", "plazos")) {
            jdbc.execute("alter table " + tabla + " alter column id restart with " + siguienteId(tabla));
        }
        return cartera;
    }

    /** Responsables adicionales del estudio; todos usan la contraseña de las cuentas responsables de la demo. */
    private void crearResponsables() {
        Set<String> correos = new HashSet<>(jdbc.queryForList("select email from usuarios", String.class));
        String hash = null;
        List<Object[]> nuevos = new ArrayList<>();
        for (String nombre : GeneradorCartera.nombresResponsables(RESPONSABLES_ADICIONALES, SEMILLA)) {
            String correo = correo(nombre);
            if (!correos.add(correo)) continue;
            if (hash == null) hash = encoder.encode(PASSWORD_RESPONSABLE);
            nuevos.add(new Object[] {nombre, correo, hash});
        }
        if (!nuevos.isEmpty()) {
            jdbc.batchUpdate("insert into usuarios (nombre, email, password_hash, rol, activo, version) "
                    + "values (?, ?, ?, 'RESPONSABLE', true, 0)", nuevos);
        }
    }

    /** "María Rojas Quispe" → "maria.rojas@legaldeadline.local". */
    static String correo(String nombre) {
        String[] partes = Normalizer.normalize(nombre, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT).split(" ");
        return partes[0] + "." + partes[1] + "@legaldeadline.local";
    }

    private <T> void insertar(String sql, List<T> filas, Function<T, Object[]> valores) {
        for (int i = 0; i < filas.size(); i += LOTE) {
            jdbc.batchUpdate(sql, filas.subList(i, Math.min(filas.size(), i + LOTE)).stream().map(valores).toList());
        }
    }

    private long siguienteId(String tabla) {
        return contar("select coalesce(max(id), 0) + 1 from " + tabla);
    }

    private long contar(String sql) {
        Long valor = jdbc.queryForObject(sql, Long.class);
        return valor == null ? 0 : valor;
    }

    private static OffsetDateTime fecha(Instant instante) {
        return instante == null ? null : instante.atOffset(ZoneOffset.UTC);
    }
}
