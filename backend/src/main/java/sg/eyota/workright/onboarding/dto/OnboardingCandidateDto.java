package sg.eyota.workright.onboarding.dto;

import java.time.LocalDate;
import java.util.UUID;

import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.onboarding.entity.PipelineStatus;

public record OnboardingCandidateDto(
        UUID id,
        String employeeCode,
        String candidateName,
        String role,
        String department,
        LocalDate startDate,
        String stage,
        String employmentType,
        String workPassType,
        int checklistProgress,
        String personalEmail,
        String mobile,
        String employmentStatus,
        String invitationEmailStatus,
        String accountStatus,
        String pipelineStatus,
        boolean foreignWorker,
        String workerCategory
) {
    public static OnboardingCandidateDto from(EmployeeEntity e, String accountStatus) {
        PipelineStatus pipeline = e.getPipelineStatus() != null ? e.getPipelineStatus() : PipelineStatus.DRAFT;
        EmployeeEntity.OnboardingStage stage =
                e.getOnboardingStage() != null ? e.getOnboardingStage() : EmployeeEntity.OnboardingStage.OFFER;
        return new OnboardingCandidateDto(
                e.getId(),
                e.getEmployeeCode(),
                e.getFullName(),
                e.getDesignation(),
                e.getDepartment(),
                e.getDateOfJoining(),
                friendly(pipeline, stage),
                e.getEmploymentType() != null ? e.getEmploymentType().name() : null,
                e.getWorkPassType(),
                e.getOnboardingProgress(),
                e.getPersonalEmail(),
                e.getMobile(),
                e.getEmploymentStatus() != null ? e.getEmploymentStatus().name() : null,
                e.getInvitationEmailStatus(),
                accountStatus,
                pipeline.name(),
                isForeignPass(e.getWorkPassType()),
                e.getWorkerCategory()
        );
    }

    private static boolean isForeignPass(String passType) {
        if (passType == null || passType.isBlank()) {
            return false;
        }
        String p = passType.trim().toUpperCase();
        return p.equals("WP") || p.equals("S PASS") || p.equals("EP") || p.equals("WORK PERMIT");
    }

    private static String friendly(PipelineStatus pipeline, EmployeeEntity.OnboardingStage legacy) {
        if (pipeline != null) {
            return switch (pipeline) {
                case DRAFT -> "Draft";
                case DOCUMENTS_PENDING -> "Documents Pending";
                case APPLICATION_SUBMITTED -> "Application Submitted";
                case IPA_APPROVED -> "IPA Approved";
                case PRE_ARRIVAL_PENDING -> "Pre-Arrival";
                case READY_FOR_TRAVEL -> "Ready for Travel";
                case ARRIVED_IN_SINGAPORE -> "Arrived";
                case POST_ARRIVAL_PENDING -> "Post-Arrival";
                case WORK_PERMIT_ISSUED -> "Work Permit Issued";
                case ONBOARDING_IN_PROGRESS -> "Onboarding In Progress";
                case READY_TO_WORK -> "Ready to Work";
                case CANCELLED -> "Cancelled";
                case ON_HOLD -> "On Hold";
            };
        }
        return switch (legacy) {
            case OFFER -> "Offer";
            case MOM_FORMS -> "MOM Forms";
            case MEDICAL -> "Medical";
            case ORIENTATION -> "Orientation";
            case COMPLETED -> "Completed";
        };
    }
}
