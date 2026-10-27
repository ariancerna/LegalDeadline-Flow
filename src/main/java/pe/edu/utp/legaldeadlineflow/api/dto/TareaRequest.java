package pe.edu.utp.legaldeadlineflow.api.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.*;
import pe.edu.utp.legaldeadlineflow.domain.Prioridad;

public record TareaRequest(
        @NotNull(message = "El expediente es obligatorio") @Positive Long expedienteId,
        @NotBlank(message = "El título es obligatorio")
        @Size(min = 3, max = 120, message = "El título debe tener entre 3 y 120 caracteres") String titulo,
        @NotBlank(message = "El tipo es obligatorio") @Size(max = 50) String tipo,
        @NotNull(message = "El responsable es obligatorio") @Positive Long responsableId,
        @NotNull(message = "La prioridad es obligatoria") Prioridad prioridad,
        @NotNull(message = "La fecha límite es obligatoria") LocalDate fechaLimite) {
    public TareaRequest {
        titulo = TextoNormalizado.limpiar(titulo);
        tipo = TextoNormalizado.codigo(tipo);
    }
}

