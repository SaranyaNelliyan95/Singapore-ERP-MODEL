package sg.eyota.workright.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.config.EyotaProperties;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(EyotaProperties properties) {
        String secret = properties.security().jwtSecret();
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("eyota.security.jwt-secret must be at least 32 characters");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = properties.security().jwtExpirationMinutes();
    }

    public String generateToken(AppUserEntity user) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(expirationMinutes * 60L);
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("uid", user.getId().toString())
                .claim("role", user.getRole().name())
                .claim("employeeId", user.getEmployeeId() != null ? user.getEmployeeId().toString() : null)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID userIdFromClaims(Claims claims) {
        return UUID.fromString(claims.get("uid", String.class));
    }

    public long expirationMinutes() {
        return expirationMinutes;
    }
}
