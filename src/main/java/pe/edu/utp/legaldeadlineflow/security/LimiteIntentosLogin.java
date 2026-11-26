package pe.edu.utp.legaldeadlineflow.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import pe.edu.utp.legaldeadlineflow.exception.DemasiadosIntentosException;

/**
 * Frena los ataques de fuerza bruta al login: tras {@code max-intentos} contraseñas fallidas para un
 * mismo correo dentro de la {@code ventana}, ese correo queda bloqueado durante {@code bloqueo}, aunque
 * después se escriba la contraseña correcta. Un login correcto reinicia la cuenta.
 *
 * <p>Se cuenta por correo, exista o no la cuenta, para no revelar qué correos están registrados.
 * Los contadores viven en memoria: bastan para una sola instancia del backend y se reinician al
 * reiniciarlo.
 */
@Component
public class LimiteIntentosLogin {

    /** Por encima de esta cantidad de correos registrados se descartan los que ya vencieron. */
    private static final int LIMPIAR_DESDE = 10_000;

    private record Registro(int fallos, Instant primerFallo, Instant bloqueadoHasta) { }

    private final ConcurrentHashMap<String, Registro> registros = new ConcurrentHashMap<>();
    private final Clock clock;
    private final int maxIntentos;
    private final Duration ventana;
    private final Duration bloqueo;

    public LimiteIntentosLogin(Clock clock,
                               @Value("${legaldeadline.login.max-intentos:5}") int maxIntentos,
                               @Value("${legaldeadline.login.ventana-minutos:15}") long ventanaMinutos,
                               @Value("${legaldeadline.login.bloqueo-minutos:15}") long bloqueoMinutos) {
        if (maxIntentos < 1 || ventanaMinutos < 1 || bloqueoMinutos < 1) {
            throw new IllegalArgumentException("Los límites de intentos de login deben ser positivos");
        }
        this.clock = clock;
        this.maxIntentos = maxIntentos;
        this.ventana = Duration.ofMinutes(ventanaMinutos);
        this.bloqueo = Duration.ofMinutes(bloqueoMinutos);
    }

    /** Lanza {@link DemasiadosIntentosException} si el correo está bloqueado en este momento. */
    public void verificar(String email) {
        Registro registro = registros.get(clave(email));
        Instant ahora = clock.instant();
        if (registro != null && registro.bloqueadoHasta() != null && ahora.isBefore(registro.bloqueadoHasta())) {
            long segundos = Math.max(1, Duration.between(ahora, registro.bloqueadoHasta()).toSeconds());
            throw new DemasiadosIntentosException(segundos);
        }
    }

    /** Suma un fallo; al llegar al máximo dentro de la ventana, bloquea el correo. */
    public void registrarFallo(String email) {
        Instant ahora = clock.instant();
        registros.compute(clave(email), (k, r) -> {
            boolean vigente = r != null && !ahora.isAfter(r.primerFallo().plus(ventana))
                    && (r.bloqueadoHasta() == null || ahora.isBefore(r.bloqueadoHasta()));
            int fallos = vigente ? r.fallos() + 1 : 1;
            Instant primerFallo = vigente ? r.primerFallo() : ahora;
            return new Registro(fallos, primerFallo, fallos >= maxIntentos ? ahora.plus(bloqueo) : null);
        });
        if (registros.size() > LIMPIAR_DESDE) limpiar(ahora);
    }

    public void registrarExito(String email) {
        registros.remove(clave(email));
    }

    private void limpiar(Instant ahora) {
        registros.entrySet().removeIf(e -> {
            Registro r = e.getValue();
            Instant fin = r.bloqueadoHasta() != null ? r.bloqueadoHasta() : r.primerFallo().plus(ventana);
            return ahora.isAfter(fin);
        });
    }

    private static String clave(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
