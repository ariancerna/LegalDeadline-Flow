package pe.edu.utp.legaldeadlineflow.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.context.ActiveProfiles;

import pe.edu.utp.legaldeadlineflow.domain.Expediente;
import pe.edu.utp.legaldeadlineflow.domain.Prioridad;
import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Tarea;
import pe.edu.utp.legaldeadlineflow.domain.TareaEstado;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.service.TareaService;

@ActiveProfiles("test")
@DataJpaTest(properties = "spring.datasource.url=jdbc:h2:mem:legaldeadline-repository-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TareaRepositoryTest {
    private static final Instant AHORA = Instant.parse("2026-09-07T02:00:00Z");

    @Autowired private ExpedienteRepository expedienteRepository;
    @Autowired private TareaRepository tareaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private TestEntityManager entityManager;

    @Test
    void detectaDuplicidadActivaYAgrupaCargaPorResponsable() {
        Usuario responsable = nuevoResponsable("responsable@test.local");
        Expediente expediente = expedienteRepository.saveAndFlush(
                new Expediente("EXP-101", "Audiencia", responsable, AHORA));
        tareaRepository.saveAndFlush(nuevaTarea(expediente, responsable, "Preparar audiencia"));

        boolean existe = tareaRepository.existsByExpedienteIdAndTituloNormalizadoAndTipoAndEstadoIn(
                expediente.getId(), "PREPARAR AUDIENCIA", "AUDIENCIA", TareaService.ESTADOS_ACTIVOS);

        assertThat(existe).isTrue();
        assertThat(tareaRepository.contarCargaActivaPorResponsable(TareaService.ESTADOS_ACTIVOS))
                .singleElement().satisfies(row -> {
                    assertThat(row[0]).isEqualTo(responsable.getId());
                    assertThat(row[1]).isEqualTo(1L);
                });
    }

    @Test
    void cargaJpqlNoIncluyeTareasCerradasNiCanceladas() {
        Usuario responsable = nuevoResponsable("responsable@test.local");
        Expediente expediente = expedienteRepository.saveAndFlush(
                new Expediente("EXP-102", "Audiencia", responsable, AHORA));
        Tarea activa = nuevaTarea(expediente, responsable, "Preparar audiencia");
        Tarea cerrada = nuevaTarea(expediente, responsable, "Presentar escrito");
        cerrada.cambiarEstado(TareaEstado.CERRADA, AHORA);
        Tarea cancelada = nuevaTarea(expediente, responsable, "Preparar anexo");
        cancelada.cambiarEstado(TareaEstado.CANCELADA, AHORA);
        tareaRepository.saveAllAndFlush(java.util.List.of(activa, cerrada, cancelada));

        assertThat(tareaRepository.countByExpedienteIdAndEstadoIn(
                expediente.getId(), TareaService.ESTADOS_ACTIVOS)).isEqualTo(1L);
        assertThat(tareaRepository.contarCargaActivaPorResponsable(TareaService.ESTADOS_ACTIVOS))
                .singleElement().satisfies(row -> assertThat(row[1]).isEqualTo(1L));
        assertThat(tareaRepository.existsByExpedienteIdAndTituloNormalizadoAndTipoAndEstadoIn(
                expediente.getId(), "PRESENTAR ESCRITO", "AUDIENCIA", TareaService.ESTADOS_ACTIVOS))
                .isFalse();
    }

    @Test
    void versionJpaImpideSobrescribirUnaActualizacionConUnaCopiaAnterior() {
        Usuario responsable = nuevoResponsable("responsable@test.local");
        Expediente expediente = expedienteRepository.saveAndFlush(
                new Expediente("EXP-103", "Audiencia", responsable, AHORA));
        Tarea copiaAnterior = tareaRepository.saveAndFlush(
                nuevaTarea(expediente, responsable, "Preparar audiencia"));
        Long id = copiaAnterior.getId();
        entityManager.detach(copiaAnterior);

        Tarea actual = tareaRepository.findById(id).orElseThrow();
        actual.cambiarEstado(TareaEstado.EN_PROGRESO, AHORA.plusSeconds(10));
        tareaRepository.saveAndFlush(actual);
        assertThat(actual.getVersion()).isGreaterThan(copiaAnterior.getVersion());
        entityManager.detach(actual);

        copiaAnterior.cambiarEstado(TareaEstado.CERRADA, AHORA.plusSeconds(20));
        assertThatThrownBy(() -> tareaRepository.saveAndFlush(copiaAnterior))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);
    }

    @Test
    void claveForaneaRechazaUnResponsableInexistente() {
        Usuario inexistente = entityManager.getEntityManager().getReference(Usuario.class, 999999L);

        assertThatThrownBy(() -> expedienteRepository.saveAndFlush(
                new Expediente("EXP-104", "Audiencia", inexistente, AHORA)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Usuario nuevoResponsable(String email) {
        return usuarioRepository.saveAndFlush(new Usuario("Responsable de pruebas", email,
                "hash-test", Rol.RESPONSABLE));
    }

    private Tarea nuevaTarea(Expediente expediente, Usuario responsable, String titulo) {
        return new Tarea(expediente, titulo, titulo.toUpperCase(java.util.Locale.ROOT), "AUDIENCIA",
                responsable, Prioridad.ALTA, LocalDate.of(2026, 9, 8), AHORA);
    }
}
