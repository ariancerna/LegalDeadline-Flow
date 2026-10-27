package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import pe.edu.utp.legaldeadlineflow.domain.Prioridad;
import pe.edu.utp.legaldeadlineflow.domain.TareaEstado;

public record TareaResponse(Long id, Long expedienteId, String titulo, String tipo,
                            Long responsableId, Prioridad prioridad, LocalDate fechaLimite,
                            TareaEstado estado, Instant creadoEn, Instant actualizadoEn, Long version) { }

