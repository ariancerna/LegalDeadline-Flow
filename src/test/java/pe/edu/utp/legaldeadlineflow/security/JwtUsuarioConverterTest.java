package pe.edu.utp.legaldeadlineflow.security;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

import pe.edu.utp.legaldeadlineflow.domain.Rol;
import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtUsuarioConverterTest {

    @Mock UsuarioRepository repository;
    private JwtUsuarioConverter converter;

    @BeforeEach
    void setUp() {
        converter = new JwtUsuarioConverter(repository);
    }

    @Test
    void usaRolActualDePersistenciaAunqueTokenIndiqueOtroRol() {
        Usuario usuario = usuario();
        when(repository.findById(7L)).thenReturn(Optional.of(usuario));
        var authentication = converter.convert(token("7", 3L));
        assertThat(authentication.getName()).isEqualTo("7");
        assertThat(authentication.getAuthorities()).extracting("authority").containsExactly("ROLE_RESPONSABLE");
    }

    @Test
    void rechazaUsuarioInexistenteInactivoVersionAnteriorOSujetoInvalido() {
        assertThatThrownBy(() -> converter.convert(token("7", 3L))).isInstanceOf(OAuth2AuthenticationException.class);
        Usuario usuario = usuario();
        when(repository.findById(7L)).thenReturn(Optional.of(usuario));
        assertThatThrownBy(() -> converter.convert(token("7", 2L))).isInstanceOf(OAuth2AuthenticationException.class);
        assertThatThrownBy(() -> converter.convert(token("otro", 3L))).isInstanceOf(OAuth2AuthenticationException.class);
        usuario.desactivar();
        assertThatThrownBy(() -> converter.convert(token("7", 3L))).isInstanceOf(OAuth2AuthenticationException.class);
    }

    private static Jwt token(String subject, long version) {
        return Jwt.withTokenValue("token").header("alg", "HS256").subject(subject)
                .claim("version", version).claim("rol", "ADMINISTRADOR").build();
    }

    private static Usuario usuario() {
        Usuario usuario = new Usuario("Ana", "ana@example.com", "hash", Rol.RESPONSABLE);
        ReflectionTestUtils.setField(usuario, "id", 7L);
        ReflectionTestUtils.setField(usuario, "version", 3L);
        return usuario;
    }
}
