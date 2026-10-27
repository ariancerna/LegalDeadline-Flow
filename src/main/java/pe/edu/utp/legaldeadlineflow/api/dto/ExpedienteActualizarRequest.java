package pe.edu.utp.legaldeadlineflow.api.dto;

import jakarta.validation.constraints.*;

public record ExpedienteActualizarRequest(
        @NotBlank @Size(max = 20) String codigo,
        @NotBlank @Size(max = 255) String asunto,
        @NotNull @Positive Long responsableId,
        @NotNull(message = "La versión es obligatoria") @PositiveOrZero Long version) {
    public ExpedienteActualizarRequest {
        codigo = TextoNormalizado.codigo(codigo);
        asunto = TextoNormalizado.limpiar(asunto);
    }
}

