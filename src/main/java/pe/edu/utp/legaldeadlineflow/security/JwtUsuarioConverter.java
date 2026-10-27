package pe.edu.utp.legaldeadlineflow.security;

import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import pe.edu.utp.legaldeadlineflow.domain.Usuario;
import pe.edu.utp.legaldeadlineflow.repository.UsuarioRepository;

@Component
public class JwtUsuarioConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UsuarioRepository usuarioRepository;

    public JwtUsuarioConverter(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Long id;
        try {
            id = Long.valueOf(jwt.getSubject());
        } catch (NumberFormatException ex) {
            throw invalido();
        }
        Usuario usuario = usuarioRepository.findById(id).filter(Usuario::isActivo)
                .orElseThrow(JwtUsuarioConverter::invalido);
        Object version = jwt.getClaim("version");
        if (!(version instanceof Number numero) || usuario.getVersion() == null
                || numero.longValue() != usuario.getVersion()) {
            throw invalido();
        }
        return new JwtAuthenticationToken(jwt,
                List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().name())), id.toString());
    }

    private static OAuth2AuthenticationException invalido() {
        return new OAuth2AuthenticationException(new OAuth2Error("invalid_token"),
                "El token no corresponde a un usuario activo o debe renovarse");
    }
}
