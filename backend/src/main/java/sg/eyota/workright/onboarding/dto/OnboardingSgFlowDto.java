package sg.eyota.workright.onboarding.dto;

import java.time.LocalDate;
import java.util.List;

/** Additive SG-flow v2 payload nested under onboarding detail (null when flag OFF). */
public record OnboardingSgFlowDto(
        boolean enabled,
        boolean readyToWork,
        boolean readyGateLocked,
        boolean wpIssuanceBlocked,
        String medicalUnfitWarning,
        List<String> wpIssuanceBlockers,
        List<String> readyToWorkBlockers,
        List<String> deadlineWarnings,
        List<String> applicableStepCodes,
        WorkerFields worker,
        ComplianceFields compliance,
        /** Shared with Still-required / progress — READY only when every applicable step is done. */
        String gateLabel,
        int gateProgressPercent
) {
    public record WorkerFields(
            String nationality,
            String nationalityCode,
            String gender,
            String sector,
            String workerCategory,
            String accommodationType,
            Integer dormCapacity,
            LocalDate workPassApplicationDate,
            LocalDate arrivalDate,
            boolean malaysian,
            boolean cmpSector,
            boolean constructionSector,
            boolean manufacturingSector,
            boolean pcpRequired
    ) {}

    public record ComplianceFields(
            Boolean securityBondPurchased,
            Boolean medicalInsuranceRecorded,
            Boolean pcpRecorded,
            Boolean momAddressRegistered,
            Boolean ipaExtensionRequested,
            String constructionSafetyStatus,
            String tpNumber,
            LocalDate tpIssueDate,
            LocalDate tpExpiryDate,
            boolean tpValid,
            String finNumberMasked,
            String passportNumberMasked
    ) {}
}
