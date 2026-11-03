package sg.eyota.workright.enrollment.dto;

import jakarta.validation.constraints.NotBlank;

public record ValidateInvitationRequest(@NotBlank String token) {}
