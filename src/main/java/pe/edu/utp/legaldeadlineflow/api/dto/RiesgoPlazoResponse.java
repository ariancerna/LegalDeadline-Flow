package pe.edu.utp.legaldeadlineflow.api.dto;

import pe.edu.utp.legaldeadlineflow.domain.NivelRiesgo;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;

public record RiesgoPlazoResponse(
        Long plazoId,
        PlazoEstado estado,
        NivelRiesgo nivel,
        long diasRestantes,
        long tareasPendientes) {
}
