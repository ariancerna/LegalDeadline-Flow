package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.*;

public record PlazoRequest(
        @NotNull(message = "El expediente es obligatorio") @Positive Long expedienteId,
        @NotBlank(message = "El tipo es obligatorio") @Size(max = 50) String tipo,
        @NotNull(message = "La fecha límite es obligatoria") LocalDate fechaLimite) {
    public PlazoRequest { tipo = TextoNormalizado.codigo(tipo); }
}

