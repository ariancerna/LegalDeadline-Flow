package pe.edu.utp.legaldeadlineflow.security;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import pe.edu.utp.legaldeadlineflow.api.dto.LoginRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.LoginResponse;
import pe.edu.utp.legaldeadlineflow.api.dto.UsuarioResponse;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;

@Service
@Transactional(readOnly = true)
public class AuthService {

    public static final String ISSUER = "legaldeadline-flow";
    public static final String AUDIENCE = "legaldeadline-api";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final AccesoService accesoService;
    private final Clock clock;
    private final long expirationSeconds;
    private final String dummyPasswordHash;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
                       JwtEncoder jwtEncoder, AccesoService accesoService, Clock clock,
                       @Value("${legaldeadline.jwt.expiration-seconds:3600}") long expirationSeconds) {
        if (expirationSeconds < 60 || expirationSeconds > 86400) {
            throw new IllegalArgumentException("La duración del JWT debe estar entre 60 y 86400 segundos");
        }
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.accesoService = accesoService;
        this.clock = clock;
        this.expirationSeconds = expirationSeconds;
        this.dummyPasswordHash = passwordEncoder.encode("credencial-interna-no-utilizable");
    }

    public LoginResponse login(LoginRequest request) {
        if (request.password() == null || request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw credencialesInvalidas();
        }
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(request.email()).orElse(null);
        String hash = usuario == null ? dummyPasswordHash : usuario.getPasswordHash();
        boolean passwordValido = passwordEncoder.matches(request.password(), hash);
        if (usuario == null || !usuario.isActivo() || !passwordValido) {
            throw credencialesInvalidas();
        }
        Instant ahora = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .audience(List.of(AUDIENCE))
                .subject(usuario.getId().toString())
                .issuedAt(ahora)
                .notBefore(ahora)
                .expiresAt(ahora.plusSeconds(expirationSeconds))
                .claim("rol", usuario.getRol().name())
                .claim("version", usuario.getVersion())
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginResponse(token, "Bearer", expirationSeconds, UsuarioResponse.from(usuario));
    }

    public UsuarioResponse actual() {
        return UsuarioResponse.from(accesoService.usuarioActual());
    }

    private static BadCredentialsException credencialesInvalidas() {
        return new BadCredentialsException("El correo o la contraseña son incorrectos");
    }
}
