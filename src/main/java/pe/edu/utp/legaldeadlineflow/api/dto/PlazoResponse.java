package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import pe.edu.utp.legaldeadlineflow.domain.NivelRiesgo;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;

/**
 * Plazo con el código y asunto de su expediente y el riesgo calculado (RN04), para que un listado
 * no necesite una consulta adicional por fila. {@code GET /plazos/{id}/riesgo} sigue disponible.
 */
public record PlazoResponse(Long id, Long expedienteId, String expedienteCodigo, String expedienteAsunto,
                            String tipo, LocalDate fechaLimite, PlazoEstado estado, String motivoAnulacion,
                            Instant creadoEn, Instant anuladoEn, Instant actualizadoEn, Long version,
                            NivelRiesgo nivelRiesgo, long diasRestantes, long tareasPendientes) { }
