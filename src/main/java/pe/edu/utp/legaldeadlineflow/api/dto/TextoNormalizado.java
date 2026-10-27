package pe.edu.utp.legaldeadlineflow.api.dto;

import java.util.Locale;

final class TextoNormalizado {
    private TextoNormalizado() { }
    static String limpiar(String valor) {
        return valor == null ? null : valor.trim().replaceAll("\\s+", " ");
    }
    static String codigo(String valor) {
        String limpio = limpiar(valor);
        return limpio == null ? null : limpio.toUpperCase(Locale.ROOT);
    }
}

