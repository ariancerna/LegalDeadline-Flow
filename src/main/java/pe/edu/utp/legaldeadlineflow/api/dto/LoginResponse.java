package pe.edu.utp.legaldeadlineflow.api.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, UsuarioResponse usuario) {
}
