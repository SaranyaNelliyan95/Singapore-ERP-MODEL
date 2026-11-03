package sg.eyota.workright.enrollment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ActivateAccountRequest(
        @NotBlank String activationToken,
        @NotBlank @Size(min = 8, max = 72) String newPassword,
        @NotBlank String confirmPassword
) {}
