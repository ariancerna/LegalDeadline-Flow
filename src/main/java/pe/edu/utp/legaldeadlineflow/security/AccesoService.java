package pe.edu.utp.legaldeadlineflow.security;

import java.util.Objects;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.utp.legaldeadlineflow.domain.Expediente;
import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Tarea;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.exception.NotFoundException;
import pe.edu.utp.legaldeadlineflow.exception.UnprocessableEntityException;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;

@Service
@Transactional(readOnly = true)
public class AccesoService {

    private final UsuarioRepository usuarioRepository;

    public AccesoService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public Usuario usuarioActual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw sinAutenticacion();
        }
        Long id;
        try {
            id = Long.valueOf(authentication.getName());
        } catch (NumberFormatException ex) {
            throw sinAutenticacion();
        }
        return usuarioRepository.findById(id).filter(Usuario::isActivo)
                .orElseThrow(AccesoService::sinAutenticacion);
    }

    public boolean esGestor() {
        return esGestor(usuarioActual());
    }

    public void exigirGestor() {
        if (!esGestor()) {
            throw denegado();
        }
    }

    public void exigirLecturaExpediente(Expediente expediente) {
        Usuario usuario = usuarioActual();
        if (!lecturaGlobal(usuario) && !Objects.equals(expediente.getResponsableId(), usuario.getId())) {
            throw denegado();
        }
    }

    public void exigirEscrituraExpediente(Expediente expediente) {
        Usuario usuario = usuarioActual();
        if (!esGestor(usuario) && !(usuario.getRol() == Rol.RESPONSABLE
                && Objects.equals(expediente.getResponsableId(), usuario.getId()))) {
            throw denegado();
        }
    }

    public void exigirLecturaTarea(Tarea tarea) {
        Usuario usuario = usuarioActual();
        if (!lecturaGlobal(usuario) && !estaAsignada(tarea, usuario)) {
            throw denegado();
        }
    }

    public void exigirEscrituraTarea(Tarea tarea) {
        Usuario usuario = usuarioActual();
        if (!esGestor(usuario) && !(usuario.getRol() == Rol.RESPONSABLE && estaAsignada(tarea, usuario))) {
            throw denegado();
        }
    }

    public Usuario validarResponsable(Long responsableId) {
        if (responsableId == null || responsableId <= 0) {
            throw new UnprocessableEntityException("RESPONSABLE_INVALIDO", "El responsable debe ser un identificador positivo");
        }
        Usuario usuario = usuarioRepository.findById(responsableId)
                .orElseThrow(() -> new NotFoundException("RESPONSABLE_NO_ENCONTRADO", "El responsable no existe"));
        if (!usuario.isActivo() || (usuario.getRol() != Rol.RESPONSABLE && usuario.getRol() != Rol.SUPERVISOR)) {
            throw new UnprocessableEntityException("RESPONSABLE_INVALIDO",
                    "El responsable debe estar activo y tener el rol RESPONSABLE o SUPERVISOR");
        }
        return usuario;
    }

    private static boolean estaAsignada(Tarea tarea, Usuario usuario) {
        return Objects.equals(tarea.getResponsableId(), usuario.getId())
                || Objects.equals(tarea.getExpediente().getResponsableId(), usuario.getId());
    }

    private static boolean lecturaGlobal(Usuario usuario) {
        return esGestor(usuario) || usuario.getRol() == Rol.AUDITOR;
    }

    private static boolean esGestor(Usuario usuario) {
        return usuario.getRol() == Rol.ADMINISTRADOR || usuario.getRol() == Rol.SUPERVISOR;
    }

    private static AuthenticationCredentialsNotFoundException sinAutenticacion() {
        return new AuthenticationCredentialsNotFoundException("Se requiere un usuario autenticado y activo");
    }

    private static AccessDeniedException denegado() {
        return new AccessDeniedException("No tienes permiso para realizar esta operación");
    }
}
