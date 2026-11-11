package sg.eyota.workright.onboarding.sg;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

/**
 * Pure Singapore MOM-aligned onboarding rules (feature-flagged as onboardingSgFlowV2).
 * No Spring / DB dependencies — unit-tested in isolation.
 */
public final class OnboardingSgFlowRules {

    public static final LocalDate TP_APPLICATION_EFFECTIVE_DATE = LocalDate.of(2026, 11, 29);
    public static final String MEDICAL_UNFIT_WARNING =
            "Work permit will be revoked / cannot be issued";

    public enum SgStep {
        SECURITY_BOND("SG_SECURITY_BOND", "Security bond purchased"),
        PCP_INSURANCE("SG_PCP_INSURANCE", "Primary Care Plan + medical insurance recorded"),
        HOUSING_MOM("SG_HOUSING_MOM", "Housing + address registered with MOM"),
        IPA_RECORD("SG_IPA_RECORD", "IPA record (date / expiry / extension)"),
        ONBOARD_CENTRE("SG_ONBOARD_CENTRE", "Onboard centre attended"),
        SIP("SG_SIP", "SIP attended within 14 days of arrival"),
        MEDICAL_EXAM("SG_MEDICAL_EXAM", "Medical exam within 14 days of arrival"),
        CONSTRUCTION_SAFETY("SG_CONSTRUCTION_SAFETY", "Construction safety course"),
        TEMPORARY_PERMIT("SG_TEMPORARY_PERMIT", "Temporary Permit (TP)"),
        WP_ISSUANCE("WP_ISSUANCE", "Record work permit issuance"),
        /** After employee uploads PPE proof — HR must approve before gate READY. */
        PPE_PHOTO_VERIFIED("SG_PPE_PHOTO_VERIFIED", "PPE photo verified by HR"),
        /** Final HR action after gate READY — not required for READY itself. */
        EMPLOYEE_ONBOARDED("SG_EMPLOYEE_ONBOARDED", "Employee onboarded");

        private final String taskCode;
        private final String title;

        SgStep(String taskCode, String title) {
            this.taskCode = taskCode;
            this.title = title;
        }

        public String taskCode() {
            return taskCode;
        }

        public String title() {
            return title;
        }
    }

    public record WorkerContext(
            boolean foreignWorker,
            String nationality,
            String nationalityCode,
            String gender,
            String sector,
            String workerCategory,
            String accommodationType,
            Integer dormCapacity,
            LocalDate workPassApplicationDate,
            LocalDate arrivalDate
    ) {}

    public record StepState(
            boolean securityBondPurchased,
            boolean medicalInsuranceRecorded,
            boolean pcpRecorded,
            boolean housingMomRegistered,
            boolean ipaRecorded,
            Boolean ipaExtensionRequested,
            boolean onboardCentreDone,
            boolean sipDone,
            boolean medicalFit,
            boolean medicalUnfit,
            boolean medicalPending,
            boolean constructionSafetyDone,
            boolean temporaryPermitValid,
            boolean workPermitIssued,
            boolean arrivalConfirmed,
            boolean contractAcked,
            boolean ppeConfirmed,
            boolean ppePhotoVerified,
            boolean inductionDone,
            boolean accountActive,
            boolean employeeOnboarded
    ) {}

    private OnboardingSgFlowRules() {}

    public static boolean isMalaysian(WorkerContext ctx) {
        String n = norm(ctx.nationality());
        String code = norm(ctx.nationalityCode());
        return code.equals("MY")
                || code.equals("MYS")
                || n.contains("MALAYSIA")
                || n.equals("MY")
                || n.equals("MYS");
    }

    /** MOM CMP = Construction, Marine, Process (and explicit "CMP"). */
    public static boolean isCmpSector(WorkerContext ctx) {
        String s = sectorBlob(ctx);
        return s.contains("CMP")
                || s.contains("PROCESS")
                || s.contains("MARINE")
                || s.contains("CONSTRUCTION");
    }

    public static boolean isConstructionSector(WorkerContext ctx) {
        String s = sectorBlob(ctx);
        return s.contains("CONSTRUCTION") || s.contains("BUILD");
    }

    public static boolean isManufacturingSector(WorkerContext ctx) {
        String s = sectorBlob(ctx);
        return s.contains("MANUFACTUR") || s.contains("FACTORY");
    }

    public static boolean isMale(WorkerContext ctx) {
        String g = norm(ctx.gender());
        return g.equals("M") || g.equals("MALE") || g.startsWith("M");
    }

    public static boolean isFemale(WorkerContext ctx) {
        String g = norm(ctx.gender());
        return g.equals("F") || g.equals("FEMALE") || g.startsWith("F");
    }

    public static boolean isDormSevenPlus(WorkerContext ctx) {
        if (ctx.dormCapacity() != null && ctx.dormCapacity() >= 7) {
            return true;
        }
        String type = norm(ctx.accommodationType());
        return type.contains("DORM") && (type.contains("7") || type.contains("LARGE"));
    }

    public static boolean pcpRequired(WorkerContext ctx) {
        return isDormSevenPlus(ctx) || isCmpSector(ctx);
    }

    public static boolean applies(SgStep step, WorkerContext ctx) {
        if (!ctx.foreignWorker()
                && step != SgStep.WP_ISSUANCE
                && step != SgStep.PPE_PHOTO_VERIFIED
                && step != SgStep.EMPLOYEE_ONBOARDED) {
            // Local/PR: hide foreign SG pass steps; keep PPE photo + onboard final
            return false;
        }
        return switch (step) {
            case SECURITY_BOND -> ctx.foreignWorker() && !isMalaysian(ctx);
            case PCP_INSURANCE -> ctx.foreignWorker();
            case HOUSING_MOM -> ctx.foreignWorker();
            case IPA_RECORD -> ctx.foreignWorker();
            case ONBOARD_CENTRE -> ctx.foreignWorker()
                    && !isMalaysian(ctx)
                    && isMale(ctx)
                    && isCmpSector(ctx);
            case SIP -> appliesSip(ctx);
            case MEDICAL_EXAM -> ctx.foreignWorker();
            case CONSTRUCTION_SAFETY -> ctx.foreignWorker() && isConstructionSector(ctx);
            case TEMPORARY_PERMIT -> appliesTemporaryPermit(ctx);
            case WP_ISSUANCE -> ctx.foreignWorker();
            case PPE_PHOTO_VERIFIED, EMPLOYEE_ONBOARDED -> true; // all hires in V2 pipeline
        };
    }

    /** Medical / SIP / Onboard / WP cannot complete without an arrival date. */
    public static boolean requiresArrivalDate(SgStep step) {
        return step == SgStep.MEDICAL_EXAM
                || step == SgStep.SIP
                || step == SgStep.ONBOARD_CENTRE
                || step == SgStep.WP_ISSUANCE
                || step == SgStep.TEMPORARY_PERMIT
                || step == SgStep.CONSTRUCTION_SAFETY;
    }

    public static String arrivalRequiredMessage() {
        return "Confirm arrival date before completing medical / programmes / permit steps";
    }

    public static Set<SgStep> applicableSteps(WorkerContext ctx) {
        EnumSet<SgStep> set = EnumSet.noneOf(SgStep.class);
        for (SgStep step : SgStep.values()) {
            if (applies(step, ctx)) {
                set.add(step);
            }
        }
        return set;
    }

    /** Dependencies that block recording work-permit issuance. */
    public static List<String> wpIssuanceBlockers(WorkerContext ctx, StepState state) {
        List<String> blockers = new ArrayList<>();
        if (ctx.arrivalDate() == null) {
            blockers.add(arrivalRequiredMessage());
        }
        if (state.medicalUnfit()) {
            blockers.add(MEDICAL_UNFIT_WARNING);
        }
        if (applies(SgStep.SECURITY_BOND, ctx) && !state.securityBondPurchased()) {
            blockers.add(SgStep.SECURITY_BOND.title() + " required");
        }
        if (applies(SgStep.PCP_INSURANCE, ctx)) {
            if (!state.medicalInsuranceRecorded()) {
                blockers.add("Medical insurance not recorded");
            }
            if (pcpRequired(ctx) && !state.pcpRecorded()) {
                blockers.add("Primary Care Plan required (dorm 7+ or CMP sector)");
            }
        }
        if (applies(SgStep.MEDICAL_EXAM, ctx)) {
            if (state.medicalPending() || (!state.medicalFit() && !state.medicalUnfit())) {
                blockers.add("Medical exam not completed");
            } else if (!state.medicalFit()) {
                blockers.add(MEDICAL_UNFIT_WARNING);
            }
        }
        if (applies(SgStep.ONBOARD_CENTRE, ctx) && !state.onboardCentreDone()) {
            blockers.add(SgStep.ONBOARD_CENTRE.title() + " required");
        }
        if (applies(SgStep.SIP, ctx) && !state.sipDone()) {
            blockers.add(SgStep.SIP.title() + " required");
        }
        if (applies(SgStep.CONSTRUCTION_SAFETY, ctx) && !state.constructionSafetyDone()) {
            blockers.add(SgStep.CONSTRUCTION_SAFETY.title() + " required");
        }
        return distinct(blockers);
    }

    /**
     * Pass/SG prerequisites for Ready-to-Work (excludes post-issuance employee/HR steps).
     * Full gate (header / Still required) is built by {@link OnboardingGateCalculator}.
     */
    public static List<String> readyToWorkBlockers(WorkerContext ctx, StepState state) {
        List<String> blockers = new ArrayList<>(wpIssuanceBlockers(ctx, state));
        if (state.medicalUnfit()) {
            blockers.add("Gate locked: medical Unfit");
        }
        if (applies(SgStep.HOUSING_MOM, ctx) && !state.housingMomRegistered()) {
            blockers.add(SgStep.HOUSING_MOM.title() + " pending");
        }
        if (applies(SgStep.IPA_RECORD, ctx) && !state.ipaRecorded()) {
            blockers.add(SgStep.IPA_RECORD.title() + " pending");
        }
        if (applies(SgStep.TEMPORARY_PERMIT, ctx) && !state.temporaryPermitValid() && !state.workPermitIssued()) {
            blockers.add("Work permit issued or valid Temporary Permit required");
        } else if (!state.workPermitIssued() && !state.temporaryPermitValid()) {
            blockers.add("Work permit not issued");
        }
        return distinct(blockers);
    }

    /**
     * Full Ready-to-Work gate items (shared by header, progress %, Still required).
     * Does NOT include EMPLOYEE_ONBOARDED (that is the post-READY HR action).
     */
    public static List<OnboardingGateCalculator.GateItem> fullGateItems(WorkerContext ctx, StepState state) {
        List<OnboardingGateCalculator.GateItem> items = new ArrayList<>();
        for (SgStep step : SgStep.values()) {
            if (step == SgStep.EMPLOYEE_ONBOARDED) {
                continue;
            }
            boolean applies = applies(step, ctx);
            boolean done = switch (step) {
                case SECURITY_BOND -> state.securityBondPurchased();
                case PCP_INSURANCE -> state.medicalInsuranceRecorded()
                        && (!pcpRequired(ctx) || state.pcpRecorded());
                case HOUSING_MOM -> state.housingMomRegistered();
                case IPA_RECORD -> state.ipaRecorded();
                case ONBOARD_CENTRE -> state.onboardCentreDone();
                case SIP -> state.sipDone();
                case MEDICAL_EXAM -> state.medicalFit();
                case CONSTRUCTION_SAFETY -> state.constructionSafetyDone();
                case TEMPORARY_PERMIT -> state.temporaryPermitValid() || state.workPermitIssued();
                case WP_ISSUANCE -> state.workPermitIssued() || state.temporaryPermitValid();
                case PPE_PHOTO_VERIFIED -> state.ppePhotoVerified();
                case EMPLOYEE_ONBOARDED -> state.employeeOnboarded();
            };
            if (step == SgStep.MEDICAL_EXAM && state.medicalUnfit()) {
                done = false;
            }
            items.add(new OnboardingGateCalculator.GateItem(step.taskCode(), step.title(), applies, done));
        }
        // Always-on post-arrival employee / HR steps for V2 gate
        items.add(new OnboardingGateCalculator.GateItem(
                "ARRIVAL", "Confirm arrival & accommodation", true, state.arrivalConfirmed()));
        items.add(new OnboardingGateCalculator.GateItem(
                "ACCOUNT_ACTIVATE", "Account activation (OTP + password)", true, state.accountActive()));
        items.add(new OnboardingGateCalculator.GateItem(
                "CONTRACT_ACK", "Employment contract acknowledgement", true, state.contractAcked()));
        items.add(new OnboardingGateCalculator.GateItem(
                "PPE_CONFIRM", "PPE issuance & employee confirmation", true, state.ppeConfirmed()));
        items.add(new OnboardingGateCalculator.GateItem(
                "INDUCTION", "Safety / workplace induction", true, state.inductionDone()));
        return items;
    }

    public static boolean isReadyToWork(WorkerContext ctx, StepState state) {
        return OnboardingGateCalculator.compute(fullGateItems(ctx, state)).ready();
    }

    public static List<String> deadlineWarnings(
            WorkerContext ctx,
            LocalDate today,
            LocalDate ipaExpiry,
            boolean medicalDone,
            boolean sipDone,
            boolean onboardDone
    ) {
        List<String> warnings = new ArrayList<>();
        LocalDate arrival = ctx.arrivalDate();
        if (arrival != null) {
            LocalDate due = arrival.plusDays(14);
            long daysLeft = java.time.temporal.ChronoUnit.DAYS.between(today, due);
            if (applies(SgStep.MEDICAL_EXAM, ctx) && !medicalDone) {
                warnings.add(deadlineLine("Medical exam", due, daysLeft));
            }
            if (applies(SgStep.SIP, ctx) && !sipDone) {
                warnings.add(deadlineLine("SIP", due, daysLeft));
            }
            if (applies(SgStep.ONBOARD_CENTRE, ctx) && !onboardDone) {
                warnings.add(deadlineLine("Onboard centre", due, daysLeft));
            }
            if (applies(SgStep.TEMPORARY_PERMIT, ctx) && !isMalaysian(ctx)) {
                LocalDate tpFrom = arrival.plusDays(1); // 2nd day after arrival
                if (today.isBefore(tpFrom)) {
                    warnings.add("Temporary Permit applicable from " + tpFrom + " (2nd day after arrival)");
                }
            }
        }
        if (ipaExpiry != null && applies(SgStep.IPA_RECORD, ctx)) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(today, ipaExpiry);
            if (days == 30 || days == 14 || days == 7 || (days >= 0 && days <= 7)) {
                if (days == 30 || days == 14 || days == 7) {
                    warnings.add("IPA expires in " + days + " day(s) (" + ipaExpiry + ")");
                } else if (days >= 0 && days < 7) {
                    warnings.add("IPA expires in " + days + " day(s) (" + ipaExpiry + ")");
                }
            } else if (days < 0) {
                warnings.add("IPA expired on " + ipaExpiry);
            }
        }
        return distinct(warnings);
    }

    public static boolean temporaryPermitEligibleDate(LocalDate applicationDate) {
        return applicationDate != null && !applicationDate.isBefore(TP_APPLICATION_EFFECTIVE_DATE);
    }

    public static boolean temporaryPermitAllowedToday(WorkerContext ctx, LocalDate today) {
        if (!appliesTemporaryPermit(ctx)) {
            return false;
        }
        if (isMalaysian(ctx)) {
            return true;
        }
        if (ctx.arrivalDate() == null) {
            return false;
        }
        LocalDate from = ctx.arrivalDate().plusDays(1);
        return !today.isBefore(from);
    }

    private static boolean appliesSip(WorkerContext ctx) {
        if (!ctx.foreignWorker() || isMalaysian(ctx)) {
            return false;
        }
        // Non-Malaysian manufacturing
        if (isManufacturingSector(ctx)) {
            return true;
        }
        // Female CMP only
        return isFemale(ctx) && isCmpSector(ctx);
    }

    private static boolean appliesTemporaryPermit(WorkerContext ctx) {
        if (!ctx.foreignWorker()) {
            return false;
        }
        return temporaryPermitEligibleDate(ctx.workPassApplicationDate());
    }

    private static String deadlineLine(String label, LocalDate due, long daysLeft) {
        if (daysLeft < 0) {
            return label + " overdue (due " + due + ", 14 days after arrival)";
        }
        return label + " due in " + daysLeft + " day(s) (by " + due + ")";
    }

    private static String sectorBlob(WorkerContext ctx) {
        return norm(Objects.toString(ctx.sector(), "") + " " + Objects.toString(ctx.workerCategory(), ""));
    }

    private static String norm(String raw) {
        return raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT);
    }

    private static List<String> distinct(List<String> in) {
        return new ArrayList<>(new LinkedHashSet<>(in));
    }
}
