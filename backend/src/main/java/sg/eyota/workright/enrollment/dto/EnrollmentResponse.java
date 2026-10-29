package sg.eyota.workright.enrollment.dto;

import java.time.Instant;
import java.util.UUID;

public record EnrollmentResponse(
        UUID invitationId,
        UUID employeeId,
        String employeeCode,
        String fullName,
        String workEmail,
        String status,
        Instant otpExpiresAt,
        /** Present only when eyota.enrollment.expose-otp-in-api=true (local/dev). */
        String devOtpPreview,
        String message
) {}
