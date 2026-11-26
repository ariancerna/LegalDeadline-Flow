package pe.edu.utp.legaldeadlineflow.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import pe.edu.utp.legaldeadlineflow.exception.DemasiadosIntentosException;

class LimiteIntentosLoginTest {

    /** Reloj que la prueba adelanta a mano. */
    private static final class RelojManual extends Clock {
        private Instant ahora = Instant.parse("2026-11-26T15:00:00Z");
        void avanzar(Duration d) { ahora = ahora.plus(d); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return ahora; }
    }

    private final RelojManual reloj = new RelojManual();
    private final LimiteIntentosLogin limite = new LimiteIntentosLogin(reloj, 5, 15, 15);

    private void fallar(String email, int veces) {
        for (int i = 0; i < veces; i++) limite.registrarFallo(email);
    }

    @Test
    void bloqueaAlQuintoFalloYDiceCuantoEsperar() {
        fallar("ana@example.com", 4);
        assertThatCode(() -> limite.verificar("ana@example.com")).doesNotThrowAnyException();
        fallar("ana@example.com", 1);
        assertThatThrownBy(() -> limite.verificar(" ANA@example.com "))
                .isInstanceOf(DemasiadosIntentosException.class)
                .hasMessageContaining("15 minutos")
                .satisfies(e -> assertThat(((DemasiadosIntentosException) e).getSegundosRestantes()).isEqualTo(900));
        // Otro correo no se ve afectado.
        assertThatCode(() -> limite.verificar("luis@example.com")).doesNotThrowAnyException();
    }

    @Test
    void elBloqueoTerminaYLaCuentaEmpiezaDeNuevo() {
        fallar("ana@example.com", 5);
        reloj.avanzar(Duration.ofMinutes(15).plusSeconds(1));
        assertThatCode(() -> limite.verificar("ana@example.com")).doesNotThrowAnyException();
        fallar("ana@example.com", 1); // primer fallo de una cuenta nueva, no el sexto
        assertThatCode(() -> limite.verificar("ana@example.com")).doesNotThrowAnyException();
    }

    @Test
    void losFallosFueraDeLaVentanaNoSeAcumulan() {
        fallar("ana@example.com", 4);
        reloj.avanzar(Duration.ofMinutes(16));
        fallar("ana@example.com", 4);
        assertThatCode(() -> limite.verificar("ana@example.com")).doesNotThrowAnyException();
    }

    @Test
    void unLoginCorrectoReiniciaLaCuenta() {
        fallar("ana@example.com", 4);
        limite.registrarExito("ana@example.com");
        fallar("ana@example.com", 4);
        assertThatCode(() -> limite.verificar("ana@example.com")).doesNotThrowAnyException();
    }

    @Test
    void rechazaLimitesNoPositivos() {
        assertThatThrownBy(() -> new LimiteIntentosLogin(reloj, 0, 15, 15)).isInstanceOf(IllegalArgumentException.class);
    }
}
