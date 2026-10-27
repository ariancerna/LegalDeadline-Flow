package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.*;
import pe.edu.utp.legaldeadlineflow.domain.Prioridad;

public record TareaActualizarRequest(
        @NotBlank @Size(min = 3, max = 120) String titulo,
        @NotBlank @Size(max = 50) String tipo,
        @NotNull @Positive Long responsableId,
        @NotNull Prioridad prioridad,
        @NotNull LocalDate fechaLimite,
        @NotNull(message = "La versión es obligatoria") @PositiveOrZero Long version) {
    public TareaActualizarRequest {
        titulo = TextoNormalizado.limpiar(titulo);
        tipo = TextoNormalizado.codigo(tipo);
    }
}

