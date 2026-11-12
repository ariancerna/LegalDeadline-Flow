package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import pe.edu.utp.legaldeadlineflow.domain.NivelRiesgo;

public record IndicadoresResponse(LocalDate fechaCalculo, long expedientesAbiertos,
        long expedientesCerrados, long expedientesArchivados, long tareasActivas,
        long tareasCerradas, long tareasCanceladas, long tareasVencidas,
        double porcentajeTareasCerradas, long plazosActivos, long plazosAnulados,
        long plazosVencidos, long plazosProximos, Map<NivelRiesgo, Long> riesgoPlazosActivos,
        List<MovimientoMes> movimientoMensual, List<MovimientoAnio> movimientoAnual) {

    /**
     * Expedientes que ingresaron y que concluyeron (cerrados o archivados) en un mes, en hora de Lima.
     * {@code mes} tiene la forma 2026-10. Para un concluido se usa su última modificación.
     */
    public record MovimientoMes(String mes, long ingresados, long concluidos) { }

    /** Lo mismo por año calendario, para los últimos 10 años incluido el actual. */
    public record MovimientoAnio(int anio, long ingresados, long concluidos) { }
}
