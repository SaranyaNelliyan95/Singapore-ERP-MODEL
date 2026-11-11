package sg.eyota.workright.enrollment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Combined OTP verification + password creation for a smoother activation flow. */
public record CompleteActivationRequest(
        @NotBlank String token,
        @NotBlank @Pattern(regexp = "\\d{6}") String otp,
        @NotBlank @Size(min = 8, max = 72) String newPassword,
        @NotBlank String confirmPassword
) {}
