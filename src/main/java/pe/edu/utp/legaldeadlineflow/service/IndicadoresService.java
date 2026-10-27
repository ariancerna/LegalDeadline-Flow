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
            NivelRiesgo nivel = plazoService.clasificar(plazo.getEstado(), dias, pendientes.getOrDefault(plazo.getExpediente().getId(), 0L));
            riesgos.merge(nivel, 1L, Long::sum);
        }
        return new IndicadoresResponse(hoy, expedientes.getOrDefault(ExpedienteEstado.ABIERTO, 0L),
                expedientes.getOrDefault(ExpedienteEstado.CERRADO, 0L), expedientes.getOrDefault(ExpedienteEstado.ARCHIVADO, 0L),
                activas, cerradas, tareas.getOrDefault(TareaEstado.CANCELADA, 0L), repository.tareasVencidas(global, usuario.getId(), hoy),
                activas + cerradas == 0 ? 0.0 : Math.round(10000.0 * cerradas / (activas + cerradas)) / 100.0,
                plazosActivos, anulados, vencidos, proximos, riesgos);
    }
}
