package sg.eyota.workright.onboarding.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record ActivateOnboardingRequest(
        boolean createLogin,
        @Email @Size(max = 256) String email
) {}
