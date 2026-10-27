package pe.edu.utp.legaldeadlineflow.api.dto;

import jakarta.validation.constraints.*;

public record VersionRequest(
        @NotNull(message = "La versión es obligatoria") @PositiveOrZero Long version) { }

