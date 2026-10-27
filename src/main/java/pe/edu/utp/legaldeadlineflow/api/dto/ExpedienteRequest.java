package pe.edu.utp.legaldeadlineflow.api.dto;

import jakarta.validation.constraints.*;

public record ExpedienteRequest(
        @NotBlank(message = "El código es obligatorio")
        @Size(max = 20, message = "El código admite como máximo 20 caracteres") String codigo,
        @NotBlank(message = "El asunto es obligatorio")
        @Size(max = 255, message = "El asunto admite como máximo 255 caracteres") String asunto,
        @NotNull(message = "El responsable es obligatorio")
        @Positive(message = "El responsable debe ser un identificador positivo") Long responsableId) {
    public ExpedienteRequest {
        codigo = TextoNormalizado.codigo(codigo);
        asunto = TextoNormalizado.limpiar(asunto);
    }
}

