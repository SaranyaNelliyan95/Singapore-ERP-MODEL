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
            int otpTtlSeconds,
            int invitationTtlHours,
            int otpResendCooldownSeconds,
            int otpMaxAttempts,
            boolean exposeOtpInApi,
            String activateBaseUrl
    ) {
        public Enrollment {
            if (otpTtlSeconds <= 0) {
                otpTtlSeconds = otpTtlMinutes > 0 ? otpTtlMinutes * 60 : 120;
            }
            if (invitationTtlHours <= 0) {
                invitationTtlHours = 72;
            }
            if (otpResendCooldownSeconds <= 0) {
                otpResendCooldownSeconds = 30;
            }
            if (otpMaxAttempts <= 0) {
                otpMaxAttempts = 5;
            }
        }
    }
}
