package pe.edu.utp.legaldeadlineflow.security;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.util.ReflectionTestUtils;

import pe.edu.utp.legaldeadlineflow.api.dto.LoginRequest;
import pe.edu.utp.legaldeadlineflow.api.dto.LoginResponse;
import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UsuarioRepository repository;
    @Mock JwtEncoder jwtEncoder;
    @Mock AccesoService acceso;

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-12T02:00:00Z"), ZoneOffset.UTC);
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(repository, passwordEncoder, jwtEncoder, acceso, clock, 3600);
    }

    @Test
    void loginEntregaTokenConEmisorAudienciaVencimientoYVersion() {
        Usuario usuario = usuario();
        when(repository.findByEmailIgnoreCase("ana@example.com")).thenReturn(Optional.of(usuario));
        when(jwtEncoder.encode(any())).thenReturn(Jwt.withTokenValue("token-firmado")
                .header("alg", "HS256").claim("sub", "7").build());

        LoginResponse response = service.login(new LoginRequest(" ANA@EXAMPLE.COM ", "ClaveSegura123"));
        assertThat(response.accessToken()).isEqualTo("token-firmado");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(3600);
        assertThat(response.usuario().id()).isEqualTo(7L);
        ArgumentCaptor<JwtEncoderParameters> captor = ArgumentCaptor.forClass(JwtEncoderParameters.class);
        verify(jwtEncoder).encode(captor.capture());
        var claims = captor.getValue().getClaims();
        assertThat(claims.getClaims().get("iss")).isEqualTo(AuthService.ISSUER);
        assertThat(claims.getAudience()).containsExactly(AuthService.AUDIENCE);
        assertThat(claims.getSubject()).isEqualTo("7");
        assertThat(claims.getExpiresAt()).isEqualTo(clock.instant().plusSeconds(3600));
        assertThat(claims.getClaims().get("version")).isEqualTo(2L);
    }

    @Test
    void loginRechazaCorreoDesconocidoPasswordIncorrectoUsuarioInactivoYPasswordExcesivo() {
        assertThatThrownBy(() -> service.login(new LoginRequest("nadie@example.com", "ClaveSegura123")))
                .isInstanceOf(BadCredentialsException.class);
        Usuario usuario = usuario();
        when(repository.findByEmailIgnoreCase("ana@example.com")).thenReturn(Optional.of(usuario));
        assertThatThrownBy(() -> service.login(new LoginRequest("ana@example.com", "ClaveIncorrecta")))
                .isInstanceOf(BadCredentialsException.class);
        usuario.desactivar();
        assertThatThrownBy(() -> service.login(new LoginRequest("ana@example.com", "ClaveSegura123")))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> service.login(new LoginRequest("ana@example.com", "é".repeat(40))))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void meDevuelveUsuarioActualSinCredencialesYRechazaDuracionesInvalidas() {
        when(acceso.usuarioActual()).thenReturn(usuario());
        assertThat(service.actual().email()).isEqualTo("ana@example.com");
        assertThatThrownBy(() -> new AuthService(repository, passwordEncoder, jwtEncoder, acceso, clock, 1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AuthService(repository, passwordEncoder, jwtEncoder, acceso, clock, 86401))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private Usuario usuario() {
        Usuario usuario = new Usuario("Ana", "ana@example.com", passwordEncoder.encode("ClaveSegura123"), Rol.RESPONSABLE);
        ReflectionTestUtils.setField(usuario, "id", 7L);
        ReflectionTestUtils.setField(usuario, "version", 2L);
        return usuario;
    }
}
