package pe.edu.utp.legaldeadlineflow.api.dto;

import pe.edu.utp.legaldeadlineflow.domain.Rol;

public record CargaTrabajoResponse(
        Long responsableId,
        String nombre,
        Rol rol,
        long tareasActivas,
        int umbral,
        boolean sobrecargado) {
}
