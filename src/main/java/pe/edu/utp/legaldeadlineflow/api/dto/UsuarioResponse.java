package pe.edu.utp.legaldeadlineflow.api.dto;

import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;

public record UsuarioResponse(Long id, String nombre, String email, Rol rol, boolean activo, Long version) {

    public static UsuarioResponse from(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNombre(), usuario.getEmail(),
                usuario.getRol(), usuario.isActivo(), usuario.getVersion());
    }
}
