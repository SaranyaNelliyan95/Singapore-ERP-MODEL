package sg.eyota.workright.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "eyota")
public record EyotaProperties(
        String timezone,
        Cors cors,
        Security security,
        Attendance attendance,
        Enrollment enrollment
) {
    public record Cors(String allowedOrigins) {}

    public record Security(
            String jwtSecret,
            int jwtExpirationMinutes,
            String bootstrapAdminEmail,
            String bootstrapAdminPassword
    ) {}

    public record Attendance(
            boolean gpsMandatoryDefault,
            double maxAccuracyMetres,
            long locationTimeoutMs,
            int defaultGeofenceRadiusMetres
    ) {}

    public record Enrollment(
            int otpTtlMinutes,
            boolean exposeOtpInApi,
            String activateBaseUrl
    ) {}
}
