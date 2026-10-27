package pe.edu.utp.legaldeadlineflow.service;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock UsuarioRepository repository;
    @Mock PasswordEncoder encoder;
    @Mock TrazabilidadService trazabilidad;

    private UsuarioService service;

    @BeforeEach
    void setUp() {
        service = new UsuarioService(repository, encoder, trazabilidad);
    }

    @Test
    void creaUsuarioConPasswordCifradoYCorreoNormalizado() {
        when(encoder.encode("ClaveSegura123")).thenReturn("hash-bcrypt");
        when(repository.saveAndFlush(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            ReflectionTestUtils.setField(usuario, "id", 12L);
            ReflectionTestUtils.setField(usuario, "version", 0L);
            return usuario;
        });
        UsuarioResponse response = service.crear(new UsuarioRequest("  Ana Pérez  ",
                "  ANA@EXAMPLE.COM  ", "ClaveSegura123", Rol.RESPONSABLE));

        assertThat(response.nombre()).isEqualTo("Ana Pérez");
        assertThat(response.email()).isEqualTo("ana@example.com");
        assertThat(response.activo()).isTrue();
        verify(encoder).encode("ClaveSegura123");
        verify(trazabilidad).registrar(eq(EventoTipo.USUARIO_CREADO), eq("USUARIO"), eq(12L), any());
    }

    @Test
    void rechazaCorreoRepetidoYPasswordsQueBcryptNoPuedeAlmacenar() {
        when(repository.existsByEmailIgnoreCase("ana@example.com")).thenReturn(true);
        assertThatThrownBy(() -> service.crear(new UsuarioRequest("Ana", "ana@example.com",
                "ClaveSegura123", Rol.RESPONSABLE))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.crear(new UsuarioRequest("Ana", "otro@example.com",
                "é".repeat(40), Rol.RESPONSABLE))).isInstanceOf(UnprocessableEntityException.class);
        assertThatThrownBy(() -> service.crear(new UsuarioRequest("Ana", "otro@example.com",
                "corta", Rol.RESPONSABLE))).isInstanceOf(UnprocessableEntityException.class);
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void listaObtieneYReportaUsuarioInexistente() {
        Usuario usuario = usuario(7, Rol.RESPONSABLE);
        when(repository.findAll(Sort.by("id"))).thenReturn(List.of(usuario));
        when(repository.findById(7L)).thenReturn(Optional.of(usuario));
        assertThat(service.listar()).extracting(UsuarioResponse::id).containsExactly(7L);
        assertThat(service.obtener(7L).rol()).isEqualTo(Rol.RESPONSABLE);
        assertThatThrownBy(() -> service.obtener(8L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void actualizaUsuarioYCambiaPasswordRegistrandoAmbosEventos() {
        Usuario usuario = usuario(7, Rol.RESPONSABLE);
        when(repository.bloquearAdministradoresActivos()).thenReturn(List.of(usuario(1, Rol.ADMINISTRADOR)));
        when(repository.findById(7L)).thenReturn(Optional.of(usuario));
        when(encoder.encode("NuevaClave123")).thenReturn("nuevo-hash");
        when(repository.saveAndFlush(usuario)).thenReturn(usuario);

        UsuarioResponse response = service.actualizar(7L, new UsuarioActualizacionRequest("Ana nueva",
                "ana.nueva@example.com", Rol.SUPERVISOR, true, "NuevaClave123"));
        assertThat(response.nombre()).isEqualTo("Ana nueva");
        assertThat(response.rol()).isEqualTo(Rol.SUPERVISOR);
        assertThat(usuario.getPasswordHash()).isEqualTo("nuevo-hash");
        verify(trazabilidad).registrar(eq(EventoTipo.USUARIO_ACTUALIZADO), eq("USUARIO"), eq(7L), any());
        verify(trazabilidad).registrar(eq(EventoTipo.USUARIO_PASSWORD_CAMBIADO), eq("USUARIO"), eq(7L), any());
    }

    @Test
    void actualizaSinPasswordYRechazaCorreoDuplicado() {
        Usuario usuario = usuario(7, Rol.RESPONSABLE);
        when(repository.findById(7L)).thenReturn(Optional.of(usuario));
        when(repository.saveAndFlush(usuario)).thenReturn(usuario);
        service.actualizar(7L, new UsuarioActualizacionRequest("Ana", "ana@example.com",
                Rol.RESPONSABLE, true, null));
        assertThat(usuario.getPasswordHash()).isEqualTo("hash");
        verify(encoder, never()).encode(any());
        when(repository.existsByEmailIgnoreCaseAndIdNot("otro@example.com", 7L)).thenReturn(true);
        assertThatThrownBy(() -> service.actualizar(7L, new UsuarioActualizacionRequest("Ana",
                "otro@example.com", Rol.RESPONSABLE, true, null))).isInstanceOf(ConflictException.class);
    }

    @Test
    void impideDesactivarODegradarUltimoAdministrador() {
        Usuario admin = usuario(1, Rol.ADMINISTRADOR);
        when(repository.bloquearAdministradoresActivos()).thenReturn(List.of(admin));
        when(repository.findById(1L)).thenReturn(Optional.of(admin));
        assertThatThrownBy(() -> service.desactivar(1L)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.actualizar(1L, new UsuarioActualizacionRequest("Ana",
                "ana@example.com", Rol.AUDITOR, true, null))).isInstanceOf(ConflictException.class);
        verify(trazabilidad, never()).registrar(any(), any(), any(), any());
    }

    @Test
    void permiteDesactivarSiHayOtroAdministradorYEsIdempotente() {
        Usuario admin = usuario(1, Rol.ADMINISTRADOR);
        when(repository.bloquearAdministradoresActivos()).thenReturn(List.of(admin, usuario(2, Rol.ADMINISTRADOR)));
        when(repository.findById(1L)).thenReturn(Optional.of(admin));
        service.desactivar(1L);
        service.desactivar(1L);
        assertThat(admin.isActivo()).isFalse();
        verify(trazabilidad).registrar(EventoTipo.USUARIO_ACTUALIZADO, "USUARIO", 1L, "Usuario desactivado");
        verify(repository).saveAndFlush(admin);
    }

    private static Usuario usuario(long id, Rol rol) {
        Usuario usuario = new Usuario("Ana", "ana@example.com", "hash", rol);
        ReflectionTestUtils.setField(usuario, "id", id);
        ReflectionTestUtils.setField(usuario, "version", 0L);
        return usuario;
    }
}
