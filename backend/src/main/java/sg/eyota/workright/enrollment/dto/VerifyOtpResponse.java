package sg.eyota.workright.enrollment.dto;

public record VerifyOtpResponse(
        boolean valid,
        String activationToken,
        String message
) {}
