package pe.edu.utp.legaldeadlineflow.api.dto;

import jakarta.validation.constraints.*;

public record AnulacionPlazoRequest(
        @NotBlank(message = "El motivo es obligatorio")
        @Size(min = 10, max = 250, message = "El motivo debe tener entre 10 y 250 caracteres") String motivo,
        @NotNull(message = "La versión es obligatoria") @PositiveOrZero Long version) {
    public AnulacionPlazoRequest { motivo = TextoNormalizado.limpiar(motivo); }
    public AnulacionPlazoRequest(String motivo) { this(motivo, 0L); }
}

