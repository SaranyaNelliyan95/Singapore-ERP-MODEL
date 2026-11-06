package sg.eyota.workright.enrollment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyActivationOtpRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 6, max = 6) String otp
) {}
