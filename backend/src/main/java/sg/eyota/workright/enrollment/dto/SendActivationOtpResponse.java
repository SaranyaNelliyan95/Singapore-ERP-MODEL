package sg.eyota.workright.enrollment.dto;

import java.time.Instant;

public record SendActivationOtpResponse(
        boolean accepted,
        String maskedEmail,
        Instant otpExpiresAt,
        int resendCooldownSeconds,
        String message,
        /** Dev only when expose-otp-in-api=true */
        String debugOtpPreview
) {}
