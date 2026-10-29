package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import pe.edu.utp.legaldeadlineflow.domain.ExpedienteEstado;
import pe.edu.utp.legaldeadlineflow.domain.NivelRiesgo;

/**
 * Expediente con su situación de trabajo: tareas activas y el plazo activo más cercano (con su riesgo,
 * RN04). Así un listado muestra qué expediente requiere atención sin consultar cada uno.
 */
public record ExpedienteResponse(Long id, String codigo, String asunto, Long responsableId,
                                 ExpedienteEstado estado, Instant creadoEn,
                                 Instant actualizadoEn, Long version,
                                 long tareasActivas, ProximoPlazo proximoPlazo) {

    /** Plazo activo con la fecha límite más cercana (puede estar vencido); null si no hay. */
    public record ProximoPlazo(Long id, String tipo, LocalDate fechaLimite, long diasRestantes, NivelRiesgo nivel) { }
}
