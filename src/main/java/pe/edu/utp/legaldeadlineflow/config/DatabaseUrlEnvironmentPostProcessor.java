package pe.edu.utp.legaldeadlineflow.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Permite configurar la base con la cadena que entregan los proveedores en la nube (Neon, Render,
 * Railway…): {@code DATABASE_URL=postgresql://usuario:clave@host/base?sslmode=require}.
 * La convierte en {@code spring.datasource.url/username/password}. Si se define
 * {@code SPRING_DATASOURCE_URL}, esta tiene prioridad y {@code DATABASE_URL} se ignora.
 * Se ejecuta después de cargar application.properties y el {@code .env} importado.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    static final String VARIABLE = "DATABASE_URL";
    private static final String FUENTE = "databaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String valor = environment.getProperty(VARIABLE);
        if (valor == null || valor.isBlank() || environment.getSystemEnvironment().containsKey("SPRING_DATASOURCE_URL")) {
            return;
        }
        environment.getPropertySources().addFirst(new MapPropertySource(FUENTE, convertir(valor.trim())));
    }

    /** Traduce {@code postgres(ql)://usuario:clave@host[:puerto]/base?parámetros} a propiedades de Spring. */
    static Map<String, Object> convertir(String databaseUrl) {
        URI uri;
        try {
            uri = URI.create(databaseUrl);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("DATABASE_URL no tiene un formato de URL válido", ex);
        }
        if (!"postgres".equals(uri.getScheme()) && !"postgresql".equals(uri.getScheme())) {
            throw new IllegalStateException("DATABASE_URL debe empezar con postgresql:// o postgres://");
        }
        if (uri.getHost() == null || uri.getPath() == null || uri.getPath().length() <= 1) {
            throw new IllegalStateException("DATABASE_URL debe incluir el host y el nombre de la base");
        }

        Map<String, String> parametros = new LinkedHashMap<>();
        if (uri.getRawQuery() != null) {
            for (String par : uri.getRawQuery().split("&")) {
                if (par.isBlank()) continue;
                String[] partes = par.split("=", 2);
                parametros.put(partes[0], partes.length > 1 ? partes[1] : "");
            }
        }
        // channel_binding es propio de libpq; el driver JDBC usa otro nombre y no lo necesita aquí.
        parametros.remove("channel_binding");
        boolean local = uri.getHost().equals("localhost") || uri.getHost().startsWith("127.");
        if (!local) parametros.putIfAbsent("sslmode", "require");

        StringBuilder jdbc = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
        if (uri.getPort() > 0) jdbc.append(':').append(uri.getPort());
        jdbc.append(uri.getRawPath());
        if (!parametros.isEmpty()) {
            jdbc.append('?').append(parametros.entrySet().stream()
                    .map(e -> e.getValue().isEmpty() ? e.getKey() : e.getKey() + "=" + e.getValue())
                    .collect(Collectors.joining("&")));
        }

        Map<String, Object> propiedades = new LinkedHashMap<>();
        propiedades.put("spring.datasource.url", jdbc.toString());
        if (uri.getRawUserInfo() != null) {
            String[] credenciales = uri.getRawUserInfo().split(":", 2);
            propiedades.put("spring.datasource.username", decodificar(credenciales[0]));
            if (credenciales.length > 1) propiedades.put("spring.datasource.password", decodificar(credenciales[1]));
        }
        return propiedades;
    }

    private static String decodificar(String valor) {
        return URLDecoder.decode(valor.replace("+", "%2B"), StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        // Después de ConfigDataEnvironmentPostProcessor, para leer también el .env importado.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
