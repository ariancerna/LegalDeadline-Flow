package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.Instant;
import pe.edu.utp.legaldeadlineflow.domain.ExpedienteEstado;

public record ExpedienteResponse(Long id, String codigo, String asunto, Long responsableId,
                                 ExpedienteEstado estado, Instant creadoEn,
                                 Instant actualizadoEn, Long version) { }

