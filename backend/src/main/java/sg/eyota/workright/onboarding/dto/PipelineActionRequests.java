package sg.eyota.workright.onboarding.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class PipelineActionRequests {
    private PipelineActionRequests() {}

    public record SetStatusRequest(
            @NotBlank String status,
            @Size(max = 2000) String reason,
            boolean forceOverride
    ) {}

    public record MomApplicationRequest(
            @Size(max = 128) String momReference,
            @Size(max = 64) String applicationType,
            LocalDate submittedAt,
            @Size(max = 2000) String portalNotes
    ) {}

    public record IpaRecordRequest(
            @NotBlank @Size(max = 128) String ipaNumber,
            LocalDate ipaIssueDate,
            LocalDate ipaExpiryDate,
            @Size(max = 2000) String notes,
            boolean markApproved,
            Boolean ipaExtensionRequested
    ) {}

    public record PreArrivalRequest(
            LocalDate plannedArrivalDate,
            String flightNumber,
            String arrivalAirport,
            String accommodationAddress,
            boolean housingConfirmed,
            boolean bondArranged,
            boolean insuranceArranged,
            boolean readyForTravel,
            String notes,
            String accommodationType,
            Integer dormCapacity,
            Boolean momAddressRegistered,
            Boolean pcpRecorded,
            Boolean medicalInsuranceRecorded,
            Boolean securityBondPurchased
    ) {}

    public record ArrivalUpdateRequest(
            LocalDate actualArrivalDate,
            String flightNumber,
            String arrivalAirport,
            String accommodationAddress,
            boolean housingConfirmed,
            boolean employeeConfirmed,
            String notes,
            String accommodationType,
            Integer dormCapacity,
            Boolean momAddressRegistered
    ) {}

    public record AppointmentRequest(
            @NotBlank String appointmentType,
            Instant scheduledAt,
            String location,
            String outcome,
            String notes
    ) {}

    public record ProgrammeStatusRequest(
            String medicalStatus,
            String sipStatus,
            String onboardProgrammeStatus,
            String quarantineStatus,
            String constructionSafetyStatus
    ) {}

    public record WorkPermitIssueRequest(
            @NotBlank String wpNumber,
            LocalDate wpIssueDate,
            LocalDate wpExpiryDate,
            String finNumber,
            boolean cardCollected,
            String notes
    ) {}

    public record TemporaryPermitRequest(
            @Size(max = 128) String tpNumber,
            LocalDate tpIssueDate,
            LocalDate tpExpiryDate,
            boolean tpValid,
            String notes
    ) {}

    public record PpeIssueRequest(
            @NotNull List<PpeItem> items
    ) {
        public record PpeItem(
                @NotBlank String itemCode,
                @NotBlank String itemName,
                int quantity
        ) {}
    }

    public record ManualOverrideRequest(
            @NotBlank String targetStatus,
            @NotBlank @Size(max = 2000) String reason
    ) {}

    public record CompleteReadyRequest(
            boolean createLogin,
            String email,
            boolean sendProgressEmail
    ) {}
}
