package pe.edu.utp.legaldeadlineflow.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import pe.edu.utp.legaldeadlineflow.api.dto.AnulacionPlazoRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.PlazoActualizarRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.PlazoRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.PlazoResponse;
import pe.edu.utp.legaldeadlineflow.api.dto.RiesgoPlazoResponse;
import pe.edu.utp.legaldeadlineflow.domain.Expediente;
import pe.edu.utp.legaldeadlineflow.domain.NivelRiesgo;
import pe.edu.utp.legaldeadlineflow.domain.Plazo;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;
import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.exception.ApiException;
import pe.edu.utp.legaldeadlineflow.exception.ConflictException;
import pe.edu.utp.legaldeadlineflow.exception.NotFoundException;
import pe.edu.utp.legaldeadlineflow.exception.UnprocessableEntityException;
import pe.edu.utp.legaldeadlineflow.repository.PlazoRepository;
import pe.edu.utp.legaldeadlineflow.repository.TareaRepository;
import pe.edu.utp.legaldeadlineflow.security.AccesoService;

@ExtendWith(MockitoExtension.class)
class PlazoServiceTest {
    private static final Instant AHORA = Instant.parse("2026-09-07T02:00:00Z");
    private static final Clock CLOCK = Clock.fixed(AHORA, ZoneId.of("America/Lima"));

    @Mock private PlazoRepository plazoRepository;
    @Mock private TareaRepository tareaRepository;
    @Mock private ExpedienteService expedienteService;
    @Mock private TrazabilidadService trazabilidadService;
    @Mock private AccesoService acceso;

    private PlazoService plazoService;
    private Usuario responsable;
    private Expediente expediente;

    @BeforeEach
    void setUp() {
        responsable = new Usuario("Responsable", "responsable@test.local", "hash-test", Rol.RESPONSABLE);
        ReflectionTestUtils.setField(responsable, "id", 7L);
        expediente = new Expediente("EXP-001", "Cobro de obligación", responsable, AHORA);
        ReflectionTestUtils.setField(expediente, "id", 1L);
        ReflectionTestUtils.setField(expediente, "version", 0L);
        plazoService = new PlazoService(plazoRepository, tareaRepository, expedienteService,
                trazabilidadService, CLOCK, acceso);
    }

    @ParameterizedTest
    @CsvSource({
            "ACTIVO,-1,0,CRITICO",
            "ACTIVO,2,1,CRITICO",
            "ACTIVO,2,0,ALTO",
            "ACTIVO,5,0,ALTO",
            "ACTIVO,6,2,MEDIO",
            "ACTIVO,10,0,MEDIO",
            "ACTIVO,11,3,BAJO",
            "ANULADO,-4,5,BAJO"
    })
    void clasificaRiesgoSegunRn04(PlazoEstado estado, long dias, long pendientes,
                                 NivelRiesgo esperado) {
        assertThat(plazoService.clasificar(estado, dias, pendientes)).isEqualTo(esperado);
    }

    @Test
    void creaPlazoConTipoNormalizadoYFechaDelReloj() {
        when(expedienteService.buscarParaActualizar(1L)).thenReturn(expediente);
        when(plazoRepository.saveAndFlush(any(Plazo.class))).thenAnswer(invocation -> {
            Plazo plazo = invocation.getArgument(0);
            ReflectionTestUtils.setField(plazo, "id", 5L);
            ReflectionTestUtils.setField(plazo, "version", 0L);
            return plazo;
        });

        PlazoResponse response = plazoService.crear(new PlazoRequest(1L, "  apelación  ", fecha(2)));

        assertThat(response.tipo()).isEqualTo("APELACIÓN");
        assertThat(response.estado()).isEqualTo(PlazoEstado.ACTIVO);
        assertThat(response.creadoEn()).isEqualTo(AHORA);
        assertThat(response.version()).isZero();
        verify(acceso).exigirEscrituraExpediente(expediente);
        verify(expedienteService).exigirAbierto(expediente);
        verify(trazabilidadService).registrar(any(), any(), any(), any());
    }

    @Test
    void calcularRiesgoUsaFechaLocalDeLimaAunqueUtcEsteEnOtroDia() {
        when(plazoRepository.findById(5L)).thenReturn(Optional.of(nuevoPlazo()));
        when(tareaRepository.countByExpedienteIdAndEstadoIn(1L, TareaService.ESTADOS_ACTIVOS))
                .thenReturn(1L);

        RiesgoPlazoResponse response = plazoService.calcularRiesgo(5L);

        assertThat(LocalDate.now(CLOCK)).isEqualTo(LocalDate.of(2026, 9, 6));
        assertThat(response.diasRestantes()).isEqualTo(2L);
        assertThat(response.tareasPendientes()).isEqualTo(1L);
        assertThat(response.nivel()).isEqualTo(NivelRiesgo.CRITICO);
        verify(acceso).exigirLecturaExpediente(expediente);
    }

    @Test
    void anulaConMotivoCompletoYConservaElRegistro() {
        Plazo plazo = nuevoPlazo();
        prepararEscritura(plazo);
        String motivo = "m".repeat(250);

        PlazoResponse response = plazoService.anular(5L, new AnulacionPlazoRequest(motivo, 0L));

        assertThat(response.estado()).isEqualTo(PlazoEstado.ANULADO);
        assertThat(response.motivoAnulacion()).isEqualTo(motivo);
        assertThat(response.anuladoEn()).isEqualTo(AHORA);
        verify(plazoRepository).saveAndFlush(plazo);
        verify(trazabilidadService).registrar(any(), any(), any(),
                org.mockito.ArgumentMatchers.eq("Plazo anulado: " + motivo));
    }

    @Test
    void rechazaUnaSegundaAnulacion() {
        Plazo plazo = nuevoPlazo();
        plazo.anular("Motivo previamente registrado", AHORA);
        prepararEscritura(plazo);

        assertThatThrownBy(() -> plazoService.anular(5L,
                new AnulacionPlazoRequest("Nuevo motivo registrado", 0L)))
                .isInstanceOf(UnprocessableEntityException.class).hasMessageContaining("ya se encuentra anulado");
        verify(plazoRepository, never()).saveAndFlush(any());
    }

    @Test
    void versionAnteriorNoPermiteAnularUnPlazoModificado() {
        Plazo plazo = nuevoPlazo();
        ReflectionTestUtils.setField(plazo, "version", 3L);
        prepararEscritura(plazo);

        assertThatThrownBy(() -> plazoService.anular(5L,
                new AnulacionPlazoRequest("Cambio de fecha judicial", 2L)))
                .isInstanceOf(ConflictException.class).hasMessageContaining("registro cambió");
        assertThat(plazo.getEstado()).isEqualTo(PlazoEstado.ACTIVO);
        verify(plazoRepository, never()).saveAndFlush(any());
    }

    @Test
    void actualizaTipoYFechaDePlazoActivo() {
        Plazo plazo = nuevoPlazo();
        prepararEscritura(plazo);

        PlazoResponse response = plazoService.actualizar(5L,
                new PlazoActualizarRequest("audiencia", fecha(10), 0L));

        assertThat(response.tipo()).isEqualTo("AUDIENCIA");
        assertThat(response.fechaLimite()).isEqualTo(fecha(10));
        verify(plazoRepository).saveAndFlush(plazo);
        verify(trazabilidadService).registrar(any(), any(), any(), any());
    }

    @Test
    void obtienePlazoComprobandoAccesoAlExpediente() {
        when(plazoRepository.findById(5L)).thenReturn(Optional.of(nuevoPlazo()));

        assertThat(plazoService.obtener(5L).expedienteId()).isEqualTo(1L);
        verify(acceso).exigirLecturaExpediente(expediente);
    }

    @Test
    void escrituraDenegadaNoModificaNiAuditaElPlazo() {
        Plazo plazo = nuevoPlazo();
        when(plazoRepository.findById(5L)).thenReturn(Optional.of(plazo));
        doThrow(new AccessDeniedException("Sin permiso"))
                .when(acceso).exigirEscrituraExpediente(expediente);

        assertThatThrownBy(() -> plazoService.anular(5L,
                new AnulacionPlazoRequest("Motivo de anulación válido", 0L)))
                .isInstanceOf(AccessDeniedException.class);
        assertThat(plazo.getEstado()).isEqualTo(PlazoEstado.ACTIVO);
        verify(plazoRepository, never()).saveAndFlush(any());
        verify(trazabilidadService, never()).registrar(any(), any(), any(), any());
    }

    @Test
    void plazoInexistenteProduce404() {
        assertThatThrownBy(() -> plazoService.obtener(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @SuppressWarnings("unchecked")
    void listadoPaginadoConservaTotalYVersion() {
        when(acceso.usuarioActual()).thenReturn(responsable);
        when(plazoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(nuevoPlazo())));

        var page = plazoService.listar(0, 20, 1L, PlazoEstado.ACTIVO, fecha(0), fecha(10));

        assertThat(page.getTotalElements()).isEqualTo(1L);
        assertThat(page.getContent()).singleElement()
                .satisfies(response -> assertThat(response.version()).isZero());
    }

    @Test
    void listadoRechazaIntervaloDeFechasInvertido() {
        assertThatThrownBy(() -> plazoService.listar(0, 20, null, null, fecha(10), fecha(0)))
                .isInstanceOf(ApiException.class).hasMessageContaining("desde");
    }

    private void prepararEscritura(Plazo plazo) {
        when(plazoRepository.findById(5L)).thenReturn(Optional.of(plazo));
        when(expedienteService.buscarParaActualizar(1L)).thenReturn(expediente);
    }

    private Plazo nuevoPlazo() {
        Plazo plazo = new Plazo(expediente, "APELACIÓN", fecha(2), AHORA);
        ReflectionTestUtils.setField(plazo, "id", 5L);
        ReflectionTestUtils.setField(plazo, "version", 0L);
        return plazo;
    }

    private LocalDate fecha(int dias) {
        return LocalDate.now(CLOCK).plusDays(dias);
    }
}
