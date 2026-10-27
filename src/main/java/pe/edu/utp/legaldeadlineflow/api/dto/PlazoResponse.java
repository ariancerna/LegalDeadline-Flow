package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.Instant;
import java.time.LocalDate;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;

public record PlazoResponse(Long id, Long expedienteId, String tipo, LocalDate fechaLimite,
                            PlazoEstado estado, String motivoAnulacion, Instant creadoEn,
                            Instant anuladoEn, Instant actualizadoEn, Long version) { }

