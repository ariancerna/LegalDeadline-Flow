package pe.edu.utp.legaldeadlineflow.api;

import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import pe.edu.utp.legaldeadlineflow.api.dto.LoginRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.LoginResponse;
import pe.edu.utp.legaldeadlineflow.api.dto.UsuarioResponse;
import pe.edu.utp.legaldeadlineflow.security.AuthService;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(authService.login(request));
    }

    @GetMapping("/me")
    public UsuarioResponse actual() {
        return authService.actual();
    }
}
