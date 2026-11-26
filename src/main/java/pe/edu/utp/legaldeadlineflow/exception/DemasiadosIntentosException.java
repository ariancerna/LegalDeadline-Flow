package pe.edu.utp.legaldeadlineflow.exception;

import org.springframework.http.HttpStatus;

/** Login bloqueado temporalmente por intentos fallidos (HTTP 429 con cabecera Retry-After). */
public class DemasiadosIntentosException extends ApiException {

    private final long segundosRestantes;

    public DemasiadosIntentosException(long segundosRestantes) {
        super(HttpStatus.TOO_MANY_REQUESTS, "DEMASIADOS_INTENTOS",
                "Demasiados intentos fallidos. Vuelve a intentarlo en " + minutos(segundosRestantes) + ".");
        this.segundosRestantes = segundosRestantes;
    }

    public long getSegundosRestantes() {
        return segundosRestantes;
    }

    private static String minutos(long segundos) {
        long m = Math.max(1, (segundos + 59) / 60);
        return m == 1 ? "1 minuto" : m + " minutos";
    }
}
