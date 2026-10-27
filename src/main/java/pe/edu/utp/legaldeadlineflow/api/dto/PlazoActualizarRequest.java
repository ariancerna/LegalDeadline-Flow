package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.*;

public record PlazoActualizarRequest(
        @NotBlank @Size(max = 50) String tipo,
        @NotNull LocalDate fechaLimite,
        @NotNull(message = "La versión es obligatoria") @PositiveOrZero Long version) {
    public PlazoActualizarRequest { tipo = TextoNormalizado.codigo(tipo); }
}

