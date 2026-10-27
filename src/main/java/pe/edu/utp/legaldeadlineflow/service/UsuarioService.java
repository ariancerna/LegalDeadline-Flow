package pe.edu.utp.legaldeadlineflow.service;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.utp.legaldeadlineflow.api.dto.UsuarioActualizacionRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.UsuarioRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.UsuarioResponse;
import pe.edu.utp.legaldeadlineflow.domain.EventoTipo;
import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.exception.ConflictException;
import pe.edu.utp.legaldeadlineflow.exception.NotFoundException;
import pe.edu.utp.legaldeadlineflow.exception.UnprocessableEntityException;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;

@Service
@PreAuthorize("hasRole('ADMINISTRADOR')")
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final TrazabilidadService trazabilidadService;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
                          TrazabilidadService trazabilidadService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.trazabilidadService = trazabilidadService;
    }

    @Transactional
    public UsuarioResponse crear(UsuarioRequest request) {
        validarPassword(request.password());
        if (usuarioRepository.existsByEmailIgnoreCase(request.email())) {
            throw emailDuplicado();
        }
        Usuario usuario = usuarioRepository.saveAndFlush(new Usuario(request.nombre(), request.email(),
                passwordEncoder.encode(request.password()), request.rol()));
        trazabilidadService.registrar(EventoTipo.USUARIO_CREADO, "USUARIO", usuario.getId(),
                "Usuario creado con rol " + usuario.getRol());
        return UsuarioResponse.from(usuario);
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listar() {
        return usuarioRepository.findAll(Sort.by("id")).stream().map(UsuarioResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse obtener(Long id) {
        return UsuarioResponse.from(buscar(id));
    }

    @Transactional
    public UsuarioResponse actualizar(Long id, UsuarioActualizacionRequest request) {
        List<Usuario> administradores = usuarioRepository.bloquearAdministradoresActivos();
        Usuario usuario = buscar(id);
        if (usuarioRepository.existsByEmailIgnoreCaseAndIdNot(request.email(), id)) {
            throw emailDuplicado();
        }
        protegerUltimoAdministrador(usuario, request.rol(), request.activo(), administradores);
        if (request.password() != null) {
            validarPassword(request.password());
        }
        // Se captura al autor antes de una posible desactivación de su propia cuenta.
        trazabilidadService.registrar(EventoTipo.USUARIO_ACTUALIZADO, "USUARIO", id,
                "Usuario actualizado: rol=" + request.rol() + ", activo=" + request.activo());
        if (request.password() != null) {
            trazabilidadService.registrar(EventoTipo.USUARIO_PASSWORD_CAMBIADO, "USUARIO", id,
                    "Contraseña actualizada por el administrador");
            usuario.cambiarPasswordHash(passwordEncoder.encode(request.password()));
        }
        usuario.actualizar(request.nombre(), request.email(), request.rol(), request.activo());
        return UsuarioResponse.from(usuarioRepository.saveAndFlush(usuario));
    }

    @Transactional
    public void desactivar(Long id) {
        List<Usuario> administradores = usuarioRepository.bloquearAdministradoresActivos();
        Usuario usuario = buscar(id);
        protegerUltimoAdministrador(usuario, usuario.getRol(), false, administradores);
        if (!usuario.isActivo()) {
            return;
        }
        trazabilidadService.registrar(EventoTipo.USUARIO_ACTUALIZADO, "USUARIO", id, "Usuario desactivado");
        usuario.desactivar();
        usuarioRepository.saveAndFlush(usuario);
    }

    private Usuario buscar(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("USUARIO_NO_ENCONTRADO", "El usuario no existe"));
    }

    private static void protegerUltimoAdministrador(Usuario usuario, Rol nuevoRol, boolean activo,
                                                    List<Usuario> administradores) {
        if (usuario.isActivo() && usuario.getRol() == Rol.ADMINISTRADOR
                && (!activo || nuevoRol != Rol.ADMINISTRADOR) && administradores.size() <= 1) {
            throw new ConflictException("ULTIMO_ADMINISTRADOR",
                    "Debe existir al menos un administrador activo; crea o activa otro antes de realizar este cambio");
        }
    }

    private static void validarPassword(String password) {
        if (password == null || password.isBlank() || password.length() < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new UnprocessableEntityException("PASSWORD_INVALIDO",
                    "La contraseña debe contener al menos 8 caracteres y ocupar como máximo 72 bytes UTF-8");
        }
    }

    private static ConflictException emailDuplicado() {
        return new ConflictException("EMAIL_DUPLICADO", "El correo ya está registrado");
    }
}
