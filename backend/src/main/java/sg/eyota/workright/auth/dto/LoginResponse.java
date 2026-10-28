package sg.eyota.workright.auth.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresInMinutes,
        AuthUserDto user
) {}
