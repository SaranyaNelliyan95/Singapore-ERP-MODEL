package sg.eyota.workright.enrollment.dto;

import jakarta.validation.constraints.NotBlank;

public record SendActivationOtpRequest(@NotBlank String token) {}
