package sg.eyota.workright.onboarding.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record OnboardingDetailDto(
        UUID employeeId,
        UUID onboardingId,
        String employeeCode,
        String candidateName,
        String personalEmail,
        String mobile,
        String role,
        String department,
        String workPassType,
        boolean foreignWorker,
        String workerCategory,
        String sector,
        String pipelineStatus,
        String legacyStage,
        int checklistProgress,
        String employmentStatus,
        String invitationEmailStatus,
        String accountStatus,
        String medicalStatus,
        String sipStatus,
        String onboardProgrammeStatus,
        String quarantineStatus,
        boolean contractAckRequired,
        boolean ppeRequired,
        boolean inductionRequired,
        String readyBlockedReason,
        String overrideReason,
        String notes,
        ArrivalDto arrival,
        WorkPassDto workPass,
        List<OnboardingTaskDto> tasks,
        List<OnboardingDocumentDto> documents,
        List<PpeDto> ppeItems,
        List<AckDto> acknowledgements,
        List<AppointmentDto> appointments,
        List<AuditDto> auditLogs,
        List<String> readinessGates
) {
    public record ArrivalDto(
            LocalDate plannedArrivalDate,
            LocalDate actualArrivalDate,
            String flightNumber,
            String arrivalAirport,
            String accommodationAddress,
            boolean housingConfirmed,
            boolean bondArranged,
            boolean insuranceArranged,
            boolean employeeConfirmed,
            String notes
    ) {}

    public record WorkPassDto(
            String ipaNumber,
            LocalDate ipaIssueDate,
            LocalDate ipaExpiryDate,
            String wpNumber,
            LocalDate wpIssueDate,
            LocalDate wpExpiryDate,
            String finNumber,
            boolean cardCollected,
            String notes
    ) {}

    public record PpeDto(
            UUID id,
            String itemCode,
            String itemName,
            int quantity,
            Instant issuedAt,
            boolean employeeConfirmed,
            Instant confirmedAt
    ) {}

    public record AckDto(String ackType, boolean acknowledged, Instant acknowledgedAt) {}

    public record AppointmentDto(
            UUID id,
            String appointmentType,
            Instant scheduledAt,
            String location,
            String outcome,
            String notes
    ) {}

    public record AuditDto(
            Instant createdAt,
            String action,
            String fromStatus,
            String toStatus,
            String details
    ) {}
}
