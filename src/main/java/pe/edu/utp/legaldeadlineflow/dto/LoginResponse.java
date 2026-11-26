package pe.edu.utp.legaldeadlineflow.dto;

public record LoginResponse(String accessToken, String tokenType, long expiresIn, UsuarioResponse usuario) {
}
