package sg.eyota.workright.onboarding.notify;

import java.util.UUID;

/** No personal identifiers in body — only a generic action + link. */
public record NotificationMessage(
        UUID employeeId,
        UUID onboardingId,
        NotificationChannel channel,
        String templateCode,
        String destination,
        String subject,
        String body,
        String securePathOnly
) {}
