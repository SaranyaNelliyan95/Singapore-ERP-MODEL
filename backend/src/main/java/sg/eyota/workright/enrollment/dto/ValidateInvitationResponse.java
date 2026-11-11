package sg.eyota.workright.enrollment.dto;

public record ValidateInvitationResponse(
        boolean valid,
        String maskedEmail,
        String employeeName,
        String employeeCode,
        String message
) {}
