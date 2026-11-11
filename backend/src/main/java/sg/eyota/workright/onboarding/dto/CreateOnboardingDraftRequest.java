package sg.eyota.workright.onboarding.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateOnboardingDraftRequest(
        @NotBlank @Size(max = 256) String fullName,
        @NotBlank @Email @Size(max = 256) String email,
        @NotBlank @Size(max = 32) String mobile,
        @NotBlank @Size(max = 128) String role,
        @NotBlank @Size(max = 128) String department,
        @NotNull LocalDate startDate,
        /** UI pass label: Local, PR, WP, S Pass, EP */
        @NotBlank @Size(max = 32) String employmentPassType,
        boolean sendInvitation,
        @Size(max = 64) String workerCategory,
        @Size(max = 128) String sector,
        @Size(max = 8) String nationalityCode
) {
    public CreateOnboardingDraftRequest {
        // compact constructor allows null optionals from older clients
    }
}
