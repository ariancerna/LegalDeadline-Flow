package pe.edu.utp.legaldeadlineflow.security;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import pe.edu.utp.legaldeadlineflow.domain.Expediente;
import pe.edu.utp.legaldeadlineflow.domain.Prioridad;
import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Tarea;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.exception.NotFoundException;
import pe.edu.utp.legaldeadlineflow.exception.UnprocessableEntityException;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccesoServiceTest {

    @Mock UsuarioRepository repository;
    private AccesoService acceso;

    @BeforeEach
    void setUp() {
        acceso = new AccesoService(repository);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void responsableAccedeASusExpedientesYTareasPeroNoARegistrosAjenos() {
        Usuario actual = autenticado(7, Rol.RESPONSABLE);
        Expediente propio = expediente(actual);
        Expediente ajeno = expediente(usuario(8, Rol.RESPONSABLE));
        Tarea propia = tarea(ajeno, actual);
        Tarea deExpedientePropio = tarea(propio, usuario(8, Rol.RESPONSABLE));
        Tarea ajena = tarea(ajeno, usuario(8, Rol.RESPONSABLE));

        assertThatCode(() -> acceso.exigirLecturaExpediente(propio)).doesNotThrowAnyException();
        assertThatCode(() -> acceso.exigirEscrituraExpediente(propio)).doesNotThrowAnyException();
        assertThatCode(() -> acceso.exigirLecturaTarea(propia)).doesNotThrowAnyException();
        assertThatCode(() -> acceso.exigirEscrituraTarea(deExpedientePropio)).doesNotThrowAnyException();
        assertThatThrownBy(() -> acceso.exigirLecturaExpediente(ajeno)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> acceso.exigirEscrituraExpediente(ajeno)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> acceso.exigirLecturaTarea(ajena)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> acceso.exigirEscrituraTarea(ajena)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(acceso::exigirGestor).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void auditorLeeGlobalmenteYNoPuedeModificarAunqueEsteAsignado() {
        Usuario auditor = autenticado(7, Rol.AUDITOR);
        Expediente expediente = expediente(usuario(8, Rol.RESPONSABLE));
        Tarea tarea = tarea(expediente, auditor);
        assertThatCode(() -> acceso.exigirLecturaExpediente(expediente)).doesNotThrowAnyException();
        assertThatCode(() -> acceso.exigirLecturaTarea(tarea)).doesNotThrowAnyException();
        assertThatThrownBy(() -> acceso.exigirEscrituraExpediente(expediente)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> acceso.exigirEscrituraTarea(tarea)).isInstanceOf(AccessDeniedException.class);
        assertThat(acceso.esGestor()).isFalse();
    }

    @Test
    void administradorYSupervisorSonGestoresYAccedenGlobalmente() {
        autenticado(7, Rol.ADMINISTRADOR);
        Expediente expediente = expediente(usuario(8, Rol.RESPONSABLE));
        Tarea tarea = tarea(expediente, usuario(8, Rol.RESPONSABLE));
        assertThatCode(acceso::exigirGestor).doesNotThrowAnyException();
        assertThatCode(() -> acceso.exigirEscrituraExpediente(expediente)).doesNotThrowAnyException();
        assertThatCode(() -> acceso.exigirEscrituraTarea(tarea)).doesNotThrowAnyException();
        autenticado(7, Rol.SUPERVISOR);
        assertThat(acceso.esGestor()).isTrue();
    }

    @Test
    void asignacionRequiereResponsableExistenteActivoYRolAsignable() {
        when(repository.findById(7L)).thenReturn(Optional.of(usuario(7, Rol.RESPONSABLE)));
        assertThat(acceso.validarResponsable(7L).getRol()).isEqualTo(Rol.RESPONSABLE);
        when(repository.findById(7L)).thenReturn(Optional.of(usuario(7, Rol.SUPERVISOR)));
        assertThat(acceso.validarResponsable(7L).getRol()).isEqualTo(Rol.SUPERVISOR);
        when(repository.findById(7L)).thenReturn(Optional.of(usuario(7, Rol.ADMINISTRADOR)));
        assertThatThrownBy(() -> acceso.validarResponsable(7L)).isInstanceOf(UnprocessableEntityException.class);
        Usuario inactivo = usuario(7, Rol.RESPONSABLE);
        inactivo.desactivar();
        when(repository.findById(7L)).thenReturn(Optional.of(inactivo));
        assertThatThrownBy(() -> acceso.validarResponsable(7L)).isInstanceOf(UnprocessableEntityException.class);
        assertThatThrownBy(() -> acceso.validarResponsable(99L)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> acceso.validarResponsable(null)).isInstanceOf(UnprocessableEntityException.class);
        assertThatThrownBy(() -> acceso.validarResponsable(0L)).isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    void noAceptaUsuarioAnonimoInexistenteOInactivo() {
        assertThatThrownBy(acceso::usuarioActual).isInstanceOf(AuthenticationCredentialsNotFoundException.class);
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "anonymousUser", "", List.of()));
        assertThatThrownBy(acceso::usuarioActual).isInstanceOf(AuthenticationCredentialsNotFoundException.class);
        Usuario usuario = autenticado(7, Rol.RESPONSABLE);
        usuario.desactivar();
        assertThatThrownBy(acceso::usuarioActual).isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    private Usuario autenticado(long id, Rol rol) {
        Usuario usuario = usuario(id, rol);
        when(repository.findById(id)).thenReturn(Optional.of(usuario));
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                Long.toString(id), "", List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()))));
        return usuario;
    }

    private static Usuario usuario(long id, Rol rol) {
        Usuario usuario = new Usuario("Ana", "ana@example.com", "hash", rol);
        ReflectionTestUtils.setField(usuario, "id", id);
        ReflectionTestUtils.setField(usuario, "version", 0L);
        return usuario;
    }

    private static Expediente expediente(Usuario responsable) {
        return new Expediente("EXP-001", "Proceso de ejemplo", responsable);
    }

    private static Tarea tarea(Expediente expediente, Usuario responsable) {
        return new Tarea(expediente, "Revisar", "revisar", "REVISIÓN", responsable,
                Prioridad.MEDIA, LocalDate.of(2026, 10, 20));
    }
}
