package sg.eyota.workright.onboarding.dto;

import java.util.UUID;

public record OnboardingActivateResponse(
        UUID employeeId,
        String employeeCode,
        String loginEmail,
        String invitationEmailStatus,
        String message
) {}
