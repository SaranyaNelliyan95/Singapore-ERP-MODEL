package sg.eyota.workright.enrollment.dto;

import java.time.Instant;
import java.util.UUID;

public record InvitationStatusResponse(
        UUID employeeId,
        String employeeCode,
        String email,
        String employmentStatus,
        String invitationStatus,
        String accountStatus,
        String emailDeliveryStatus,
        Instant invitationExpiresAt,
        Instant lastSentAt,
        String message
) {}
