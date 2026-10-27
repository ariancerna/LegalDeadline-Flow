package pe.edu.utp.legaldeadlineflow.api.dto;

import jakarta.validation.constraints.*;
import pe.edu.utp.legaldeadlineflow.domain.TareaEstado;

public record CambioEstadoTareaRequest(
        @NotNull(message = "El nuevo estado es obligatorio") TareaEstado nuevoEstado,
        Boolean confirmacionSupervisor,
        @NotNull(message = "La versión es obligatoria") @PositiveOrZero Long version) {
    public CambioEstadoTareaRequest(TareaEstado nuevoEstado, Boolean confirmacionSupervisor) {
        this(nuevoEstado, confirmacionSupervisor, 0L);
    }
    public boolean tieneConfirmacionSupervisor() { return Boolean.TRUE.equals(confirmacionSupervisor); }
}

