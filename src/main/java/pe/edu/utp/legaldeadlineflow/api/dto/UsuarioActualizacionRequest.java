package pe.edu.utp.legaldeadlineflow.api.dto;

import java.util.Locale;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import pe.edu.utp.legaldeadlineflow.domain.Rol;

public record UsuarioActualizacionRequest(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(min = 2, max = 120, message = "El nombre debe contener entre 2 y 120 caracteres")
        String nombre,

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo debe tener un formato válido")
        @Size(max = 150, message = "El correo admite como máximo 150 caracteres")
        String email,

        @NotNull(message = "El rol es obligatorio")
        Rol rol,

        @NotNull(message = "El estado activo es obligatorio")
        Boolean activo,

        @Size(min = 8, max = 72, message = "La contraseña debe contener entre 8 y 72 caracteres")
        String password) {

    public UsuarioActualizacionRequest {
        nombre = nombre == null ? null : nombre.trim();
        email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
