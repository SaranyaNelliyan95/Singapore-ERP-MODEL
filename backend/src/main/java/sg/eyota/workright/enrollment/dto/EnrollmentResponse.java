package sg.eyota.workright.enrollment.dto;

import java.time.Instant;
import java.util.UUID;

public record EnrollmentResponse(
        UUID invitationId,
        UUID employeeId,
        String employeeCode,
        String fullName,
        String workEmail,
        String employmentStatus,
        String accountStatus,
        String invitationEmailStatus,
        Instant otpExpiresAt,
        /** Present only when eyota.enrollment.expose-otp-in-api=true (local/dev). Never in production. */
        String debugOtpPreview,
        String message
) {}
