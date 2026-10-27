package pe.edu.utp.legaldeadlineflow.security;

import java.io.IOException;
import java.time.Clock;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import pe.edu.utp.legaldeadlineflow.api.error.ApiError;

@Component
public class SecurityErrorWriter {

    private final ObjectMapper objectMapper;
    private final Clock clock;

    public SecurityErrorWriter(ObjectMapper objectMapper, Clock clock) {
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public void noAutenticado(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        escribir(request, response, HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO",
                "Se requiere un token válido para acceder a este recurso");
    }

    public void prohibido(HttpServletRequest request, HttpServletResponse response) throws IOException {
        escribir(request, response, HttpStatus.FORBIDDEN, "ACCESO_DENEGADO",
                "No tienes permiso para realizar esta operación");
    }

    private void escribir(HttpServletRequest request, HttpServletResponse response,
                          HttpStatus status, String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), new ApiError(clock.instant(), status.value(),
                status.getReasonPhrase(), code, message, request.getRequestURI(), List.of()));
    }
}
