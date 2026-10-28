package pe.edu.utp.legaldeadlineflow.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;
import pe.edu.utp.legaldeadlineflow.config.GeneradorCartera.Cartera;
import pe.edu.utp.legaldeadlineflow.config.GeneradorCartera.FilaExpediente;
import pe.edu.utp.legaldeadlineflow.domain.ExpedienteEstado;
import pe.edu.utp.legaldeadlineflow.domain.PlazoEstado;
import pe.edu.utp.legaldeadlineflow.domain.TareaEstado;

class GeneradorCarteraTest {
    private static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final LocalDate HOY = LocalDate.of(2026, 10, 28);
    private static final Instant AHORA = HOY.atTime(11, 30).atZone(LIMA).toInstant();

    private static Cartera cartera(int cantidad) {
        List<Long> responsables = LongStream.rangeClosed(1, 39).boxed().toList();
        return GeneradorCartera.generar(new GeneradorCartera.Parametros(cantidad, CarteraVolumenSeeder.SEMILLA, AHORA,
                HOY, LIMA, responsables, Map.of(1L, 6L), Set.of(5L, 13L, 21L, 29L, 37L), List.of(100L, 101L),
                Set.of("00412-2026-0-1801"), 5, 10, 20, 30));
    }

    @Test
    void generaUnaCarteraRealistaYCoherente() {
        Cartera c = cartera(5000);
        assertThat(c.expedientes()).hasSize(5000);
        long abiertos = c.expedientes().stream().filter(e -> e.estado() == ExpedienteEstado.ABIERTO).count();
        long archivados = c.expedientes().stream().filter(e -> e.estado() == ExpedienteEstado.ARCHIVADO).count();
        // La mayor parte es histórica, como en un estudio con años de actividad.
        assertThat(abiertos).isBetween(500L, 1100L);
        assertThat(archivados).isGreaterThan(1500L);

        Set<String> codigos = new HashSet<>();
        for (FilaExpediente e : c.expedientes()) {
            assertThat(codigos.add(e.codigo())).isTrue();
            assertThat(e.codigo()).hasSizeLessThanOrEqualTo(20).isEqualTo(e.codigo().toUpperCase());
            assertThat(e.asunto()).hasSizeLessThanOrEqualTo(255).contains(" · ");
            assertThat(e.creadoEn()).isBeforeOrEqualTo(e.actualizadoEn()).isBefore(AHORA);
        }
        assertThat(codigos).doesNotContain("00412-2026-0-1801");

        Map<Long, Long> carga = new HashMap<>(Map.of(1L, 6L));
        c.tareas().stream().filter(t -> t.estado() == TareaEstado.PENDIENTE || t.estado() == TareaEstado.EN_PROGRESO)
                .forEach(t -> carga.merge(t.responsableId(), 1L, Long::sum));
        long sobrecargados = carga.values().stream().filter(v -> v > 5).count();
        assertThat(sobrecargados).isBetween(3L, 9L);
        assertThat(carga.values().stream().mapToLong(Long::longValue).max().orElse(0)).isLessThanOrEqualTo(9);

        long proximos14 = c.plazos().stream().filter(p -> p.estado() == PlazoEstado.ACTIVO)
                .filter(p -> !p.fechaLimite().isAfter(HOY.plusDays(14))).count();
        long vencidos = c.plazos().stream().filter(p -> p.estado() == PlazoEstado.ACTIVO)
                .filter(p -> p.fechaLimite().isBefore(HOY)).count();
        // Lo que muestran el tablero y la campana sigue siendo legible con 5000 expedientes.
        assertThat(proximos14).isBetween(25L, 90L);
        assertThat(vencidos).isBetween(1L, 15L);
        assertThat(c.eventos()).allSatisfy(e -> assertThat(e.fecha()).isBeforeOrEqualTo(AHORA));
        assertThat(c.tareas()).allSatisfy(t -> assertThat(t.creadoEn()).isBeforeOrEqualTo(t.actualizadoEn()));
        assertThat(c.plazos()).allSatisfy(p -> assertThat(p.fechaLimite().getDayOfWeek().getValue()).isLessThanOrEqualTo(5));

        System.out.printf("abiertos=%d cerrados=%d archivados=%d tareas=%d activas=%d plazos=%d proximos14=%d vencidos=%d "
                        + "eventos=%d sobrecargados=%d carga=%s%n", abiertos,
                c.expedientes().stream().filter(e -> e.estado() == ExpedienteEstado.CERRADO).count(), archivados,
                c.tareas().size(), carga.values().stream().mapToLong(Long::longValue).sum(), c.plazos().size(),
                proximos14, vencidos, c.eventos().size(), sobrecargados, carga.values().stream().sorted().toList());
    }

    @Test
    void esDeterminista() {
        assertThat(cartera(200).expedientes()).isEqualTo(cartera(200).expedientes());
    }

    @Test
    void ordinalesEnEspanol() {
        assertThat(GeneradorCartera.ordinal(1, false)).isEqualTo("1.er");
        assertThat(GeneradorCartera.ordinal(3, false)).isEqualTo("3.er");
        assertThat(GeneradorCartera.ordinal(11, false)).isEqualTo("11.º");
        assertThat(GeneradorCartera.ordinal(5, false)).isEqualTo("5.º");
        assertThat(GeneradorCartera.ordinal(2, true)).isEqualTo("2.ª");
        assertThat(CarteraVolumenSeeder.correo("María Rojas Quispe")).isEqualTo("maria.rojas@legaldeadline.local");
        assertThat(ChronoUnit.DAYS.between(HOY, GeneradorCartera.habil(LocalDate.of(2026, 10, 31)))).isEqualTo(5);
    }
}
