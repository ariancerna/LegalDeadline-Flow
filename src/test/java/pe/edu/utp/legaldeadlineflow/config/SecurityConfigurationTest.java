package pe.edu.utp.legaldeadlineflow.config;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.oauth2.jwt.JwsHeader;

import pe.edu.utp.legaldeadlineflow.security.AuthService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityConfigurationTest {

    private final SecurityConfiguration configuration = new SecurityConfiguration();
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-12T02:00:00Z"), ZoneOffset.UTC);
    private final String secret = "test-secret-32-bytes-minimum-for-hs256-validation";

    @Test
    void firmaYDecodificaHs256ConEmisorAudienciaYFechasValidas() {
        var key = configuration.jwtSecretKey(secret);
        var encoder = configuration.jwtEncoder(key);
        var decoder = configuration.jwtDecoder(key, clock);
        String token = token(encoder, AuthService.ISSUER, AuthService.AUDIENCE, clock.instant().plusSeconds(3600));
        assertThat(decoder.decode(token).getSubject()).isEqualTo("7");
    }

    @Test
    void rechazaTokenVencidoEmisorAjenoAudienciaAjenaYFirmaAjena() {
        var key = configuration.jwtSecretKey(secret);
        var encoder = configuration.jwtEncoder(key);
        var decoder = configuration.jwtDecoder(key, clock);
        assertThatThrownBy(() -> decoder.decode(token(encoder, AuthService.ISSUER, AuthService.AUDIENCE,
                clock.instant().minusSeconds(1)))).isInstanceOf(JwtValidationException.class);
        assertThatThrownBy(() -> decoder.decode(token(encoder, AuthService.ISSUER, AuthService.AUDIENCE,
                clock.instant()))).isInstanceOf(JwtValidationException.class);
        assertThatThrownBy(() -> decoder.decode(token(encoder, "otro-emisor", AuthService.AUDIENCE,
                clock.instant().plusSeconds(3600)))).isInstanceOf(JwtValidationException.class);
        assertThatThrownBy(() -> decoder.decode(token(encoder, AuthService.ISSUER, "otra-api",
                clock.instant().plusSeconds(3600)))).isInstanceOf(JwtValidationException.class);
        var otherEncoder = configuration.jwtEncoder(configuration.jwtSecretKey(secret + "otro"));
        assertThatThrownBy(() -> decoder.decode(token(otherEncoder, AuthService.ISSUER, AuthService.AUDIENCE,
                clock.instant().plusSeconds(3600)))).isInstanceOf(org.springframework.security.oauth2.jwt.BadJwtException.class);
    }

    @Test
    void rechazaClaveDebilYComodinesCors() {
        assertThatThrownBy(() -> configuration.jwtSecretKey("clave-corta"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> configuration.corsConfigurationSource("*"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(configuration.corsConfigurationSource("http://localhost:5173")).isNotNull();
    }

    private String token(JwtEncoder encoder, String issuer, String audience, Instant expiration) {
        var claims = JwtClaimsSet.builder().issuer(issuer).audience(List.of(audience)).subject("7")
                .issuedAt(clock.instant().minusSeconds(60)).notBefore(clock.instant().minusSeconds(60))
                .expiresAt(expiration).claim("version", 0L).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
