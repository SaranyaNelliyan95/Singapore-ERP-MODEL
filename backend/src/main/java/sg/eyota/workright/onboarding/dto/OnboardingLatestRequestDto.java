package sg.eyota.workright.onboarding.dto;

import java.time.Instant;
import java.util.UUID;

/** Notification-style item for HR dashboard Latest requests. */
public record OnboardingLatestRequestDto(
        String requestType,
        String title,
        String summary,
        UUID employeeId,
        String employeeCode,
        String candidateName,
        UUID documentId,
        String fileName,
        String contentType,
        Instant createdAt,
        String actionLabel
) {}
