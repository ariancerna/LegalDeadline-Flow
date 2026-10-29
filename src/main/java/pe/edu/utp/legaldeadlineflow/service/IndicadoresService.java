package pe.edu.utp.legaldeadlineflow.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utp.legaldeadlineflow.api.dto.IndicadoresResponse;
import pe.edu.utp.legaldeadlineflow.domain.*;
import pe.edu.utp.legaldeadlineflow.repository.IndicadoresRepository;
import pe.edu.utp.legaldeadlineflow.security.AccesoService;

@Service
public class IndicadoresService {
    private final IndicadoresRepository repository;
    private final AccesoService acceso;
    private final PlazoService plazoService;
    private final Clock clock;

    public IndicadoresService(IndicadoresRepository repository, AccesoService acceso, PlazoService plazoService, Clock clock) {
        this.repository = repository; this.acceso = acceso; this.plazoService = plazoService; this.clock = clock;
    }

    @Transactional(readOnly = true)
    public IndicadoresResponse consultar() {
        Usuario usuario = acceso.usuarioActual();
        boolean global = usuario.getRol() != Rol.RESPONSABLE;
        LocalDate hoy = LocalDate.now(clock);
        Map<ExpedienteEstado, Long> expedientes = new EnumMap<>(ExpedienteEstado.class);
        repository.expedientesPorEstado(global, usuario.getId()).forEach(r -> expedientes.put((ExpedienteEstado)r[0], ((Number)r[1]).longValue()));
        Map<TareaEstado, Long> tareas = new EnumMap<>(TareaEstado.class);
        repository.tareasPorEstado(global, usuario.getId()).forEach(r -> tareas.put((TareaEstado)r[0], ((Number)r[1]).longValue()));
        long activas = tareas.getOrDefault(TareaEstado.PENDIENTE, 0L) + tareas.getOrDefault(TareaEstado.EN_PROGRESO, 0L);
        long cerradas = tareas.getOrDefault(TareaEstado.CERRADA, 0L);
        Map<Long, Long> pendientes = repository.tareasActivasPorExpediente(global, usuario.getId()).stream()
                .collect(Collectors.toMap(r -> (Long)r[0], r -> ((Number)r[1]).longValue()));
        Map<NivelRiesgo, Long> riesgos = new EnumMap<>(NivelRiesgo.class);
        for (NivelRiesgo nivel : NivelRiesgo.values()) riesgos.put(nivel, 0L);
        long plazosActivos=0, anulados=0, vencidos=0, proximos=0;
        for (Plazo plazo : repository.plazos(global, usuario.getId())) {
            if (plazo.getEstado() == PlazoEstado.ANULADO) { anulados++; continue; }
            plazosActivos++;
            long dias = ChronoUnit.DAYS.between(hoy, plazo.getFechaLimite());
            if (dias < 0) vencidos++;
            if (dias >= 0 && dias <= 7) proximos++;
            NivelRiesgo nivel = PlazoService.clasificar(plazo.getEstado(), dias, pendientes.getOrDefault(plazo.getExpediente().getId(), 0L));
            riesgos.merge(nivel, 1L, Long::sum);
        }
        return new IndicadoresResponse(hoy, expedientes.getOrDefault(ExpedienteEstado.ABIERTO, 0L),
                expedientes.getOrDefault(ExpedienteEstado.CERRADO, 0L), expedientes.getOrDefault(ExpedienteEstado.ARCHIVADO, 0L),
                activas, cerradas, tareas.getOrDefault(TareaEstado.CANCELADA, 0L), repository.tareasVencidas(global, usuario.getId(), hoy),
                activas + cerradas == 0 ? 0.0 : Math.round(10000.0 * cerradas / (activas + cerradas)) / 100.0,
                plazosActivos, anulados, vencidos, proximos, riesgos,
                movimientoMensual(global, usuario.getId(), hoy));
    }

    /** Ingresos y conclusiones de los últimos 12 meses, incluido el actual. */
    private java.util.List<IndicadoresResponse.MovimientoMes> movimientoMensual(boolean global, Long usuarioId, LocalDate hoy) {
        java.time.ZoneId zona = clock.getZone();
        java.time.YearMonth actual = java.time.YearMonth.from(hoy);
        java.time.YearMonth primero = actual.minusMonths(11);
        java.time.Instant desde = primero.atDay(1).atStartOfDay(zona).toInstant();
        java.util.Map<java.time.YearMonth, long[]> meses = new java.util.LinkedHashMap<>();
        for (java.time.YearMonth m = primero; !m.isAfter(actual); m = m.plusMonths(1)) meses.put(m, new long[2]);
        for (Object[] fila : repository.movimientoExpedientes(global, usuarioId, desde)) {
            java.time.Instant creado = (java.time.Instant) fila[0];
            ExpedienteEstado estado = (ExpedienteEstado) fila[1];
            java.time.Instant actualizado = (java.time.Instant) fila[2];
            long[] ingreso = meses.get(java.time.YearMonth.from(creado.atZone(zona)));
            if (ingreso != null) ingreso[0]++;
            if (estado != ExpedienteEstado.ABIERTO) {
                long[] cierre = meses.get(java.time.YearMonth.from(actualizado.atZone(zona)));
                if (cierre != null) cierre[1]++;
            }
        }
        return meses.entrySet().stream()
                .map(e -> new IndicadoresResponse.MovimientoMes(e.getKey().toString(), e.getValue()[0], e.getValue()[1]))
                .toList();
    }
}
