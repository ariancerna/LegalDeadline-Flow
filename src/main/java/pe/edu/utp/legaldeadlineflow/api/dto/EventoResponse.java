package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.Instant;

import pe.edu.utp.legaldeadlineflow.domain.EventoTipo;

public record EventoResponse(
        Long id,
        EventoTipo tipo,
        String recurso,
        Long recursoId,
        String detalle,
        Instant fecha,
        Long usuarioId,
        String usuarioEmail) {
}
