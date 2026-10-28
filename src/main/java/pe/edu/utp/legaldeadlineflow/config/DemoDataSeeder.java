package pe.edu.utp.legaldeadlineflow.config;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.legaldeadlineflow.domain.*;
import pe.edu.utp.legaldeadlineflow.repository.*;

/**
 * Carga una cartera de demostración con datos ficticios pero verosímiles (RF19, RNF07).
 * Los nombres, partes y números de expediente son inventados y no corresponden a casos reales.
 * El asunto sigue la convención "Materia · Partes · Órgano jurisdiccional", que el frontend
 * muestra por separado. La carga es idempotente: no se repite si el expediente principal existe.
 */
@Component
@ConditionalOnProperty(name = "legaldeadline.demo.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {
    static final String EXPEDIENTE_PRINCIPAL = "00412-2026-0-1801";
    private static final String PASSWORD_RESPONSABLE = "ResponsableDemo123!";

    private final UsuarioRepository usuarios;
    private final ExpedienteRepository expedientes;
    private final TareaRepository tareas;
    private final PlazoRepository plazos;
    private final EventoRepository eventos;
    private final PasswordEncoder encoder;
    private final Clock clock;

    public DemoDataSeeder(UsuarioRepository usuarios, ExpedienteRepository expedientes, TareaRepository tareas,
                          PlazoRepository plazos, EventoRepository eventos, PasswordEncoder encoder, Clock clock) {
        this.usuarios=usuarios; this.expedientes=expedientes; this.tareas=tareas; this.plazos=plazos;
        this.eventos=eventos; this.encoder=encoder; this.clock=clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        Usuario admin = usuario("Carlos Huamán Ríos", "admin@legaldeadline.local", "AdminDemo123!", Rol.ADMINISTRADOR);
        Usuario supervisora = usuario("Andrea Salazar Medina", "supervisor@legaldeadline.local", "SupervisorDemo123!", Rol.SUPERVISOR);
        Usuario jorge = usuario("Jorge Mendoza Quispe", "responsable@legaldeadline.local", PASSWORD_RESPONSABLE, Rol.RESPONSABLE);
        usuario("Lucía Torres Vega", "auditor@legaldeadline.local", "AuditorDemo123!", Rol.AUDITOR);
        Usuario paola = usuario("Paola Vargas Cárdenas", "paola.vargas@legaldeadline.local", PASSWORD_RESPONSABLE, Rol.RESPONSABLE);
        Usuario diego = usuario("Diego Ramírez Soto", "diego.ramirez@legaldeadline.local", PASSWORD_RESPONSABLE, Rol.RESPONSABLE);
        // También evita mezclar carteras en bases creadas con la versión anterior de la demostración.
        if (expedientes.existsByCodigo(EXPEDIENTE_PRINCIPAL) || expedientes.existsByCodigo("DEMO-001")) return;

        Instant ahora = clock.instant();
        LocalDate hoy = LocalDate.now(clock);

        Expediente civil = expediente(EXPEDIENTE_PRINCIPAL,
                "Obligación de dar suma de dinero · Rodríguez Paredes c. Inmobiliaria Los Andes S.A.C. · 5.º Juzgado Civil de Lima",
                jorge, ExpedienteEstado.ABIERTO, ahora);
        Expediente laboral = expediente("00198-2026-0-1801",
                "Desnaturalización de contrato · Quispe Mamani c. Distribuidora Pacífico S.A. · 3.er Juzgado Especializado de Trabajo de Lima",
                paola, ExpedienteEstado.ABIERTO, ahora);
        Expediente danos = expediente("00057-2026-0-1801",
                "Indemnización por daños y perjuicios · Fernández Lozano c. Clínica San Gabriel S.A.C. · 12.º Juzgado Civil de Lima",
                diego, ExpedienteEstado.ABIERTO, ahora);
        Expediente nulidad = expediente("00321-2026-0-1801",
                "Nulidad de acto jurídico · Sucesión Gutiérrez Alva c. Banco Andino del Perú · 2.º Juzgado Civil de Lima",
                supervisora, ExpedienteEstado.ABIERTO, ahora);
        Expediente garantias = expediente("00266-2026-0-1817",
                "Ejecución de garantías · Caja Municipal del Sur c. Comercial Rímac E.I.R.L. · 1.er Juzgado Comercial de Lima",
                diego, ExpedienteEstado.ABIERTO, ahora);
        Expediente alimentos = expediente("00733-2025-0-1801",
                "Alimentos · Torres Huamán c. Salinas Ruiz · 4.º Juzgado de Paz Letrado de Lima",
                jorge, ExpedienteEstado.CERRADO, ahora);
        expediente("00981-2024-0-1801",
                "Desalojo por ocupación precaria · Inversiones Miraflores S.A. c. Castro Díaz · 7.º Juzgado Civil de Lima",
                paola, ExpedienteEstado.ARCHIVADO, ahora);

        // Jorge supera el umbral de 5 tareas activas para mostrar la detección de sobrecarga (RF16).
        tarea(civil, "Contestar la demanda", "ESCRITO", jorge, Prioridad.ALTA, hoy.minusDays(1), TareaEstado.PENDIENTE, ahora);
        tarea(civil, "Preparar alegatos para la audiencia de saneamiento", "ESCRITO", jorge, Prioridad.MEDIA, hoy, TareaEstado.EN_PROGRESO, ahora);
        tarea(civil, "Ofrecer medios probatorios documentales", "ESCRITO", jorge, Prioridad.MEDIA, hoy.plusDays(1), TareaEstado.PENDIENTE, ahora);
        tarea(civil, "Revisar la notificación de la Resolución N.º 3", "REVISION", jorge, Prioridad.MEDIA, hoy.plusDays(2), TareaEstado.PENDIENTE, ahora);
        tarea(civil, "Coordinar la declaración del testigo", "REUNION", jorge, Prioridad.BAJA, hoy.plusDays(3), TareaEstado.PENDIENTE, ahora);
        tarea(civil, "Presentar escrito de apersonamiento", "ESCRITO", jorge, Prioridad.MEDIA, hoy.plusDays(4), TareaEstado.PENDIENTE, ahora);
        Tarea calificada = tarea(civil, "Calificar la demanda y abrir el legajo interno", "REVISION", jorge, Prioridad.BAJA, hoy.minusDays(6), TareaEstado.CERRADA, ahora);
        tarea(civil, "Solicitar copias certificadas", "ESCRITO", jorge, Prioridad.BAJA, hoy.plusDays(3), TareaEstado.CANCELADA, ahora);

        tarea(laboral, "Calcular beneficios sociales adeudados", "REVISION", paola, Prioridad.ALTA, hoy.plusDays(2), TareaEstado.EN_PROGRESO, ahora);
        tarea(laboral, "Redactar la demanda de desnaturalización", "ESCRITO", paola, Prioridad.MEDIA, hoy.plusDays(6), TareaEstado.PENDIENTE, ahora);
        tarea(laboral, "Validar boletas de pago con el cliente", "REUNION", paola, Prioridad.BAJA, hoy.plusDays(1), TareaEstado.PENDIENTE, ahora);

        tarea(danos, "Obtener la historia clínica certificada", "NOTIFICACION", diego, Prioridad.ALTA, hoy.plusDays(3), TareaEstado.PENDIENTE, ahora);
        tarea(danos, "Preparar el informe pericial de parte", "REVISION", diego, Prioridad.MEDIA, hoy.plusDays(9), TareaEstado.PENDIENTE, ahora);
        tarea(danos, "Enviar carta notarial de requerimiento", "ESCRITO", diego, Prioridad.MEDIA, hoy.minusDays(10), TareaEstado.CERRADA, ahora);

        tarea(nulidad, "Analizar los títulos de propiedad", "REVISION", supervisora, Prioridad.MEDIA, hoy.plusDays(5), TareaEstado.EN_PROGRESO, ahora);
        tarea(garantias, "Verificar la tasación del inmueble", "REVISION", diego, Prioridad.BAJA, hoy.plusDays(12), TareaEstado.PENDIENTE, ahora);
        tarea(alimentos, "Presentar la liquidación de pensiones devengadas", "ESCRITO", jorge, Prioridad.MEDIA, hoy.minusDays(20), TareaEstado.CERRADA, ahora);

        Plazo vencido = plazos.save(new Plazo(civil, "CONTESTACION", hoy.minusDays(1), ahora));
        plazos.save(new Plazo(civil, "AUDIENCIA_SANEAMIENTO", hoy.plusDays(2), ahora));
        plazos.save(new Plazo(civil, "OFRECIMIENTO_PRUEBAS", hoy.plusDays(4), ahora));
        plazos.save(new Plazo(civil, "ALEGATOS", hoy.plusDays(9), ahora));
        Plazo anulado = new Plazo(civil, "AUDIENCIA_CONCILIACION", hoy.plusDays(5), ahora);
        anulado.anular("Audiencia reprogramada por el juzgado mediante la Resolución N.º 4", ahora);
        plazos.save(anulado);
        plazos.save(new Plazo(laboral, "SUBSANACION", hoy.plusDays(3), ahora));
        plazos.save(new Plazo(laboral, "PRESENTACION_DEMANDA", hoy.plusDays(12), ahora));
        plazos.save(new Plazo(danos, "EXCEPCIONES", hoy.plusDays(6), ahora));
        plazos.save(new Plazo(danos, "PERICIA", hoy.plusDays(20), ahora));
        plazos.save(new Plazo(nulidad, "CONTESTACION", hoy.plusDays(8), ahora));
        plazos.save(new Plazo(garantias, "APELACION", hoy.plusDays(5), ahora));

        // Historial de los últimos días para que la bitácora muestre actividad verosímil.
        evento(EventoTipo.EXPEDIENTE_CREADO, "EXPEDIENTE", alimentos.getId(), "Registro del expediente 00733-2025-0-1801", admin, ahora, 26 * 24);
        evento(EventoTipo.EXPEDIENTE_CERRADO, "EXPEDIENTE", alimentos.getId(), "Estado cambiado de ABIERTO a CERRADO", supervisora, ahora, 19 * 24);
        evento(EventoTipo.EXPEDIENTE_CREADO, "EXPEDIENTE", civil.getId(), "Registro del expediente " + EXPEDIENTE_PRINCIPAL, admin, ahora, 9 * 24);
        evento(EventoTipo.EXPEDIENTE_CREADO, "EXPEDIENTE", laboral.getId(), "Registro del expediente 00198-2026-0-1801", supervisora, ahora, 7 * 24);
        evento(EventoTipo.EXPEDIENTE_CREADO, "EXPEDIENTE", danos.getId(), "Registro del expediente 00057-2026-0-1801", supervisora, ahora, 6 * 24);
        evento(EventoTipo.TAREA_ESTADO_CAMBIADO, "TAREA", calificada.getId(), "Estado cambiado de PENDIENTE a CERRADA", jorge, ahora, 6 * 24 - 3);
        evento(EventoTipo.EXPEDIENTE_CREADO, "EXPEDIENTE", nulidad.getId(), "Registro del expediente 00321-2026-0-1801", supervisora, ahora, 4 * 24);
        evento(EventoTipo.EXPEDIENTE_CREADO, "EXPEDIENTE", garantias.getId(), "Registro del expediente 00266-2026-0-1817", admin, ahora, 3 * 24);
        evento(EventoTipo.PLAZO_ANULADO, "PLAZO", anulado.getId(), "Plazo anulado. Motivo: Audiencia reprogramada por el juzgado mediante la Resolución N.º 4", supervisora, ahora, 2 * 24);
        evento(EventoTipo.EXPEDIENTE_ACTUALIZADO, "EXPEDIENTE", civil.getId(), "Asunto actualizado con el órgano jurisdiccional", jorge, ahora, 26);
        evento(EventoTipo.PLAZO_CREADO, "PLAZO", vencido.getId(), "Plazo de contestación de demanda registrado", jorge, ahora, 5);
    }

    private Usuario usuario(String nombre, String email, String password, Rol rol) {
        return usuarios.findByEmailIgnoreCase(email).orElseGet(() -> usuarios.save(
                new Usuario(nombre, email, encoder.encode(password), rol)));
    }

    private Expediente expediente(String codigo, String asunto, Usuario responsable, ExpedienteEstado estado, Instant ahora) {
        Expediente expediente = new Expediente(codigo, asunto, responsable, ahora);
        if (estado != ExpedienteEstado.ABIERTO) expediente.cambiarEstado(estado, ahora);
        return expedientes.save(expediente);
    }

    private Tarea tarea(Expediente expediente, String titulo, String tipo, Usuario responsable, Prioridad prioridad,
                       LocalDate fechaLimite, TareaEstado estado, Instant ahora) {
        Tarea tarea = new Tarea(expediente, titulo, titulo.toUpperCase(Locale.ROOT), tipo, responsable, prioridad, fechaLimite, ahora);
        if (estado != TareaEstado.PENDIENTE) tarea.cambiarEstado(estado, ahora);
        return tareas.save(tarea);
    }

    private void evento(EventoTipo tipo, String recurso, Long recursoId, String detalle, Usuario autor, Instant ahora, long horasAtras) {
        eventos.save(new Evento(tipo, recurso, recursoId, detalle, autor, ahora.minus(Duration.ofHours(horasAtras))));
    }
}
