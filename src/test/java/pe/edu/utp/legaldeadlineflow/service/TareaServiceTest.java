package pe.edu.utp.legaldeadlineflow.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import pe.edu.utp.legaldeadlineflow.api.dto.CambioEstadoTareaRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.TareaActualizarRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.TareaRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.TareaResponse;
import pe.edu.utp.legaldeadlineflow.api.dto.VersionRequest;
import pe.edu.utp.legaldeadlineflow.domain.Expediente;
import pe.edu.utp.legaldeadlineflow.domain.Prioridad;
import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Tarea;
import pe.edu.utp.legaldeadlineflow.domain.TareaEstado;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.exception.ApiException;
import pe.edu.utp.legaldeadlineflow.exception.ConflictException;
import pe.edu.utp.legaldeadlineflow.exception.NotFoundException;
import pe.edu.utp.legaldeadlineflow.exception.UnprocessableEntityException;
import pe.edu.utp.legaldeadlineflow.repository.TareaRepository;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;
import pe.edu.utp.legaldeadlineflow.security.AccesoService;

@ExtendWith(MockitoExtension.class)
class TareaServiceTest {
    private static final Instant AHORA = Instant.parse("2026-09-07T02:00:00Z");
    private static final Clock CLOCK = Clock.fixed(AHORA, ZoneId.of("America/Lima"));

    @Mock private TareaRepository tareaRepository;
    @Mock private ExpedienteService expedienteService;
    @Mock private TrazabilidadService trazabilidadService;
    @Mock private UsuarioRepository usuarioRepository;

    private TareaService tareaService;
    private Expediente expediente;
    private Usuario responsable;

    @BeforeEach
    void setUp() {
        responsable = usuario(7L, Rol.RESPONSABLE);
        expediente = new Expediente("EXP-001", "Cobro de obligación", responsable, AHORA);
        ReflectionTestUtils.setField(expediente, "id", 1L);
        ReflectionTestUtils.setField(expediente, "version", 0L);
        tareaService = new TareaService(tareaRepository, expedienteService, trazabilidadService,
                new AccesoService(usuarioRepository), CLOCK);
    }

    @AfterEach
    void limpiarAutenticacion() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void creaTareaValidaNormalizandoTituloYTipo() {
        autenticar(responsable);
        when(expedienteService.buscarParaActualizar(1L)).thenReturn(expediente);
        when(tareaRepository.saveAndFlush(any(Tarea.class))).thenAnswer(invocation -> {
            Tarea tarea = invocation.getArgument(0);
            ReflectionTestUtils.setField(tarea, "id", 9L);
            ReflectionTestUtils.setField(tarea, "version", 0L);
            return tarea;
        });

        TareaResponse response = tareaService.crear(new TareaRequest(1L,
                "  Preparar   escrito  ", "escrito", 7L, Prioridad.MEDIA, fecha(5)));

        assertThat(response.titulo()).isEqualTo("Preparar escrito");
        assertThat(response.tipo()).isEqualTo("ESCRITO");
        assertThat(response.estado()).isEqualTo(TareaEstado.PENDIENTE);
        assertThat(response.responsableId()).isEqualTo(7L);
        assertThat(response.creadoEn()).isEqualTo(AHORA);
        assertThat(response.version()).isZero();
        verify(expedienteService).buscarParaActualizar(1L);
        verify(trazabilidadService).registrar(any(), any(), any(), any());
    }

    @Test
    void rechazaTareaActivaEquivalente() {
        autenticar(responsable);
        when(expedienteService.buscarParaActualizar(1L)).thenReturn(expediente);
        when(tareaRepository.existsByExpedienteIdAndTituloNormalizadoAndTipoAndEstadoIn(
                any(), any(), any(), any())).thenReturn(true);

        assertThatThrownBy(() -> tareaService.crear(new TareaRequest(1L,
                "Preparar escrito", "ESCRITO", 7L, Prioridad.MEDIA, fecha(5))))
                .isInstanceOf(ConflictException.class).hasMessageContaining("tarea activa equivalente");
        verify(tareaRepository, never()).saveAndFlush(any());
    }

    @Test
    void impideCerrarTareaAltaSinConfirmacion() {
        Tarea tarea = nuevaTarea(Prioridad.ALTA);
        prepararEscritura(tarea, responsable);

        assertThatThrownBy(() -> tareaService.cambiarEstado(9L,
                new CambioEstadoTareaRequest(TareaEstado.CERRADA, false, 0L)))
                .isInstanceOf(UnprocessableEntityException.class).hasMessageContaining("confirmación");
        assertThat(tarea.getEstado()).isEqualTo(TareaEstado.PENDIENTE);
        verify(tareaRepository, never()).saveAndFlush(any());
    }

    @Test
    void confirmacionEnElCuerpoNoDaPermisoDeSupervisorAlResponsable() {
        Tarea tarea = nuevaTarea(Prioridad.ALTA);
        prepararEscritura(tarea, responsable);

        assertThatThrownBy(() -> tareaService.cambiarEstado(9L,
                new CambioEstadoTareaRequest(TareaEstado.CERRADA, true, 0L)))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(tarea.getEstado()).isEqualTo(TareaEstado.PENDIENTE);
        verify(tareaRepository, never()).saveAndFlush(any());
        verify(trazabilidadService, never()).registrar(any(), any(), any(), any());
    }

    @Test
    void cierraTareaAltaConConfirmacionDelSupervisorAutenticado() {
        Tarea tarea = nuevaTarea(Prioridad.ALTA);
        prepararEscritura(tarea, usuario(8L, Rol.SUPERVISOR));

        TareaResponse response = tareaService.cambiarEstado(9L,
                new CambioEstadoTareaRequest(TareaEstado.CERRADA, true, 0L));

        assertThat(response.estado()).isEqualTo(TareaEstado.CERRADA);
        assertThat(response.actualizadoEn()).isEqualTo(AHORA);
        verify(tareaRepository).saveAndFlush(tarea);
        verify(trazabilidadService).registrar(any(), any(), any(), any());
    }

    @Test
    void tareaCerradaNoAdmiteOtraTransicion() {
        Tarea tarea = nuevaTarea(Prioridad.ALTA);
        tarea.cambiarEstado(TareaEstado.CERRADA, AHORA);
        prepararEscritura(tarea, responsable);

        assertThatThrownBy(() -> tareaService.cambiarEstado(9L,
                new CambioEstadoTareaRequest(TareaEstado.EN_PROGRESO, true, 0L)))
                .isInstanceOf(UnprocessableEntityException.class).hasMessageContaining("No se permite");
    }

    @Test
    void versionAnteriorNoSobrescribeElEstadoActual() {
        Tarea tarea = nuevaTarea(Prioridad.MEDIA);
        ReflectionTestUtils.setField(tarea, "version", 2L);
        prepararEscritura(tarea, responsable);

        assertThatThrownBy(() -> tareaService.cambiarEstado(9L,
                new CambioEstadoTareaRequest(TareaEstado.EN_PROGRESO, false, 1L)))
                .isInstanceOf(ConflictException.class).hasMessageContaining("registro cambió");
        assertThat(tarea.getEstado()).isEqualTo(TareaEstado.PENDIENTE);
        verify(tareaRepository, never()).saveAndFlush(any());
    }

    @Test
    void responsableActualizaDatosDeSuTareaSinCambiarPrioridad() {
        Tarea tarea = nuevaTarea(Prioridad.MEDIA);
        prepararEscritura(tarea, responsable);

        TareaResponse response = tareaService.actualizar(9L,
                new TareaActualizarRequest("Preparar alegatos", "alegato", 7L,
                        Prioridad.MEDIA, fecha(8), 0L));

        assertThat(response.titulo()).isEqualTo("Preparar alegatos");
        assertThat(response.tipo()).isEqualTo("ALEGATO");
        assertThat(response.fechaLimite()).isEqualTo(fecha(8));
        verify(tareaRepository).saveAndFlush(tarea);
        verify(trazabilidadService).registrar(any(), any(), any(), any());
    }

    @Test
    void responsableNoPuedeElevarSuPropiaPrioridad() {
        Tarea tarea = nuevaTarea(Prioridad.MEDIA);
        prepararEscritura(tarea, responsable);

        assertThatThrownBy(() -> tareaService.actualizar(9L,
                new TareaActualizarRequest("Preparar alegatos", "ALEGATO", 7L,
                        Prioridad.ALTA, fecha(8), 0L))).isInstanceOf(AccessDeniedException.class);
        assertThat(tarea.getPrioridad()).isEqualTo(Prioridad.MEDIA);
        verify(tareaRepository, never()).saveAndFlush(any());
    }

    @Test
    void responsableNoPuedeReasignarTareaAOtroUsuario() {
        Tarea tarea = nuevaTarea(Prioridad.MEDIA);
        prepararEscritura(tarea, responsable);

        assertThatThrownBy(() -> tareaService.actualizar(9L,
                new TareaActualizarRequest("Preparar alegatos", "ALEGATO", 8L,
                        Prioridad.MEDIA, fecha(8), 0L))).isInstanceOf(AccessDeniedException.class);
        assertThat(tarea.getResponsableId()).isEqualTo(7L);
    }

    @Test
    void cancelarMantieneLaTareaYRegistraElEvento() {
        Tarea tarea = nuevaTarea(Prioridad.MEDIA);
        prepararEscritura(tarea, responsable);

        assertThat(tareaService.cancelar(9L, new VersionRequest(0L)).estado())
                .isEqualTo(TareaEstado.CANCELADA);
        verify(tareaRepository).saveAndFlush(tarea);
        verify(trazabilidadService).registrar(any(), any(), any(), any());
    }

    @Test
    void tareaFinalizadaNoSePuedeEditar() {
        Tarea tarea = nuevaTarea(Prioridad.MEDIA);
        tarea.cambiarEstado(TareaEstado.CANCELADA, AHORA);
        prepararEscritura(tarea, responsable);

        assertThatThrownBy(() -> tareaService.actualizar(9L,
                new TareaActualizarRequest("Preparar alegatos", "ALEGATO", 7L,
                        Prioridad.MEDIA, fecha(8), 0L)))
                .isInstanceOf(UnprocessableEntityException.class).hasMessageContaining("finalizada");
    }

    @Test
    void obtieneTareaAsignadaConVersion() {
        Tarea tarea = nuevaTarea(Prioridad.MEDIA);
        autenticar(responsable);
        when(tareaRepository.findById(9L)).thenReturn(Optional.of(tarea));

        assertThat(tareaService.obtener(9L).id()).isEqualTo(9L);
    }

    @Test
    void consultarTareaAjenaEsDenegado() {
        autenticar(usuario(10L, Rol.RESPONSABLE));
        when(tareaRepository.findById(9L)).thenReturn(Optional.of(nuevaTarea(Prioridad.MEDIA)));

        assertThatThrownBy(() -> tareaService.obtener(9L)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void tareaInexistenteProduce404() {
        assertThatThrownBy(() -> tareaService.obtener(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void listaLasTareasDelExpedienteAutorizado() {
        autenticar(responsable);
        when(expedienteService.buscarEntidad(1L)).thenReturn(expediente);
        when(tareaRepository.findByExpedienteIdOrderByCreadoEnAsc(1L))
                .thenReturn(List.of(nuevaTarea(Prioridad.MEDIA)));

        assertThat(tareaService.listarPorExpediente(1L)).singleElement()
                .satisfies(response -> assertThat(response.id()).isEqualTo(9L));
    }

    @Test
    @SuppressWarnings("unchecked")
    void listadoPaginadoConservaElTotal() {
        autenticar(responsable);
        when(tareaRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(nuevaTarea(Prioridad.MEDIA))));

        assertThat(tareaService.listar(0, 20, 1L, 7L, TareaEstado.PENDIENTE,
                Prioridad.MEDIA, fecha(0), fecha(10)).getTotalElements()).isEqualTo(1L);
    }

    @Test
    void rechazaIntervaloDeFechasInvertido() {
        assertThatThrownBy(() -> tareaService.listar(0, 20, null, null, null, null,
                fecha(10), fecha(0))).isInstanceOf(ApiException.class).hasMessageContaining("desde");
    }

    private void prepararEscritura(Tarea tarea, Usuario usuario) {
        autenticar(usuario);
        when(tareaRepository.findById(9L)).thenReturn(Optional.of(tarea));
        when(expedienteService.buscarParaActualizar(1L)).thenReturn(expediente);
    }

    private void autenticar(Usuario usuario) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                usuario.getId().toString(), null,
                List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().name()))));
        when(usuarioRepository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
    }

    private Usuario usuario(Long id, Rol rol) {
        Usuario usuario = new Usuario("Usuario " + id, "usuario" + id + "@test.local", "hash-test", rol);
        ReflectionTestUtils.setField(usuario, "id", id);
        ReflectionTestUtils.setField(usuario, "version", 0L);
        return usuario;
    }

    private Tarea nuevaTarea(Prioridad prioridad) {
        Tarea tarea = new Tarea(expediente, "Presentar escrito", "PRESENTAR ESCRITO", "ESCRITO",
                responsable, prioridad, fecha(2), AHORA);
        ReflectionTestUtils.setField(tarea, "id", 9L);
        ReflectionTestUtils.setField(tarea, "version", 0L);
        return tarea;
    }

    private LocalDate fecha(int dias) {
        return LocalDate.now(CLOCK).plusDays(dias);
    }
}
