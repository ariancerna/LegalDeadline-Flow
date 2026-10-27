package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.LocalDate;
import java.util.Map;
import pe.edu.utp.legaldeadlineflow.domain.NivelRiesgo;

public record IndicadoresResponse(LocalDate fechaCalculo, long expedientesAbiertos,
        long expedientesCerrados, long expedientesArchivados, long tareasActivas,
        long tareasCerradas, long tareasCanceladas, long tareasVencidas,
        double porcentajeTareasCerradas, long plazosActivos, long plazosAnulados,
        long plazosVencidos, long plazosProximos, Map<NivelRiesgo, Long> riesgoPlazosActivos) {
}
