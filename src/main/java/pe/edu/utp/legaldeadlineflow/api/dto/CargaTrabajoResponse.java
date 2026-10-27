package pe.edu.utp.legaldeadlineflow.api.dto;

public record CargaTrabajoResponse(
        Long responsableId,
        long tareasActivas,
        int umbral,
        boolean sobrecargado) {
}
