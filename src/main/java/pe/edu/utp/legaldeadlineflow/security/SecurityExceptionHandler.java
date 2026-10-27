package pe.edu.utp.legaldeadlineflow.security;

import java.time.Clock;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import pe.edu.utp.legaldeadlineflow.api.error.ApiError;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityExceptionHandler {

    private final Clock clock;

    public SecurityExceptionHandler(Clock clock) {
        this.clock = clock;
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> noAutenticado(AuthenticationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
                .body(error(HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO",
                        "El correo, la contraseña o el token no son válidos", request));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> prohibido(AccessDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error(HttpStatus.FORBIDDEN,
                "ACCESO_DENEGADO", "No tienes permiso para realizar esta operación", request));
    }

    private ApiError error(HttpStatus status, String code, String message, HttpServletRequest request) {
        return new ApiError(clock.instant(), status.value(), status.getReasonPhrase(), code,
                message, request.getRequestURI(), List.of());
    }
}
