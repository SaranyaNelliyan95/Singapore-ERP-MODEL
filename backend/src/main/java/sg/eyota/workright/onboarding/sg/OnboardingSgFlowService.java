package sg.eyota.workright.onboarding.sg;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.onboarding.dto.OnboardingSgFlowDto;
import sg.eyota.workright.onboarding.entity.ArrivalRecordEntity;
import sg.eyota.workright.onboarding.entity.CandidateOnboardingEntity;
import sg.eyota.workright.onboarding.entity.EmployeeAcknowledgementEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskStatus;
import sg.eyota.workright.onboarding.entity.PipelineStatus;
import sg.eyota.workright.onboarding.entity.ProgrammeOutcome;
import sg.eyota.workright.onboarding.entity.PpeIssuanceEntity;
import sg.eyota.workright.onboarding.entity.WorkPassApplicationEntity;
import sg.eyota.workright.onboarding.entity.WorkPassRecordEntity;
import sg.eyota.workright.onboarding.repository.ArrivalRecordRepository;
import sg.eyota.workright.onboarding.repository.CandidateOnboardingRepository;
import sg.eyota.workright.onboarding.repository.EmployeeAcknowledgementRepository;
import sg.eyota.workright.onboarding.repository.OnboardingTaskRepository;
import sg.eyota.workright.onboarding.repository.PpeIssuanceRepository;
import sg.eyota.workright.onboarding.repository.WorkPassApplicationRepository;
import sg.eyota.workright.onboarding.repository.WorkPassRecordRepository;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowRules.SgStep;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowRules.StepState;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowRules.WorkerContext;

@Service
public class OnboardingSgFlowService {

    private final OnboardingSgFlowProperties properties;
    private final OnboardingTaskRepository taskRepository;
    private final CandidateOnboardingRepository onboardingRepository;
    private final ArrivalRecordRepository arrivalRepository;
    private final WorkPassRecordRepository workPassRecordRepository;
    private final WorkPassApplicationRepository applicationRepository;
    private final EmployeeAcknowledgementRepository ackRepository;
    private final PpeIssuanceRepository ppeRepository;
    private final AppUserRepository appUserRepository;

    public OnboardingSgFlowService(
            OnboardingSgFlowProperties properties,
            OnboardingTaskRepository taskRepository,
            CandidateOnboardingRepository onboardingRepository,
            ArrivalRecordRepository arrivalRepository,
            WorkPassRecordRepository workPassRecordRepository,
            WorkPassApplicationRepository applicationRepository,
            EmployeeAcknowledgementRepository ackRepository,
            PpeIssuanceRepository ppeRepository,
            AppUserRepository appUserRepository
    ) {
        this.properties = properties;
        this.taskRepository = taskRepository;
        this.onboardingRepository = onboardingRepository;
        this.arrivalRepository = arrivalRepository;
        this.workPassRecordRepository = workPassRecordRepository;
        this.applicationRepository = applicationRepository;
        this.ackRepository = ackRepository;
        this.ppeRepository = ppeRepository;
        this.appUserRepository = appUserRepository;
    }

    public boolean enabled() {
        return properties.isSgFlowV2();
    }

    @Transactional
    public void ensureSgTasks(EmployeeEntity employee, CandidateOnboardingEntity co) {
        if (!enabled()) {
            return;
        }
        WorkerContext ctx = workerContext(employee, co);
        int order = 200;
        for (SgStep step : SgStep.values()) {
            if (step == SgStep.WP_ISSUANCE) {
                // WP_ISSUANCE already exists in legacy checklist for foreign workers
                syncExistingWpTask(co, ctx);
                continue;
            }
            Optional<OnboardingTaskEntity> existing =
                    taskRepository.findByOnboardingIdAndTaskCode(co.getId(), step.taskCode());
            boolean applies = OnboardingSgFlowRules.applies(step, ctx);
            if (existing.isEmpty()) {
                OnboardingTaskEntity t = new OnboardingTaskEntity();
                t.setEmployeeId(employee.getId());
                t.setOnboardingId(co.getId());
                t.setTaskCode(step.taskCode());
                t.setTitle(step.title());
                t.setStageGate(stageFor(step));
                t.setMandatory(applies);
                t.setApplies(applies);
                t.setSortOrder(order);
                t.setStatus(applies ? OnboardingTaskStatus.PENDING : OnboardingTaskStatus.NOT_APPLICABLE);
                taskRepository.save(t);
            } else {
                OnboardingTaskEntity t = existing.get();
                t.setApplies(applies);
                t.setMandatory(applies);
                if (!applies) {
                    t.setStatus(OnboardingTaskStatus.NOT_APPLICABLE);
                    t.setWarningText(null);
                } else if (t.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE) {
                    t.setStatus(OnboardingTaskStatus.PENDING);
                }
                taskRepository.save(t);
            }
            order += 10;
        }
        if (!co.isSgFlowV2TasksSeeded()) {
            co.setSgFlowV2TasksSeeded(true);
            onboardingRepository.save(co);
        }
        syncTaskCompletionFromRecords(employee.getId(), co, ctx);
    }

    public WorkerContext workerContext(EmployeeEntity employee, CandidateOnboardingEntity co) {
        ArrivalRecordEntity arrival = arrivalRepository.findByEmployeeId(employee.getId()).orElse(null);
        LocalDate appDate = applicationRepository.findByEmployeeIdOrderByCreatedAtDesc(employee.getId()).stream()
                .findFirst()
                .map(WorkPassApplicationEntity::getSubmittedAt)
                .orElse(null);
        return new WorkerContext(
                co.isForeignWorker(),
                employee.getNationality(),
                employee.getNationalityCode(),
                employee.getGender(),
                co.getSector() != null ? co.getSector() : employee.getSector(),
                co.getWorkerCategory() != null ? co.getWorkerCategory() : employee.getWorkerCategory(),
                arrival != null ? arrival.getAccommodationType() : null,
                arrival != null ? arrival.getDormCapacity() : null,
                appDate,
                arrival != null && arrival.getActualArrivalDate() != null
                        ? arrival.getActualArrivalDate()
                        : (arrival != null ? arrival.getPlannedArrivalDate() : null)
        );
    }

    public StepState stepState(UUID employeeId, CandidateOnboardingEntity co) {
        ArrivalRecordEntity arrival = arrivalRepository.findByEmployeeId(employeeId).orElse(null);
        WorkPassRecordEntity wp = workPassRecordRepository.findByEmployeeId(employeeId).orElse(null);
        ProgrammeOutcome medical = co.getMedicalStatus();
        boolean unfit = medical == ProgrammeOutcome.UNFIT;
        boolean fit = medical == ProgrammeOutcome.FIT
                || medical == ProgrammeOutcome.COMPLETED;
        boolean medicalPending = medical == null || medical == ProgrammeOutcome.PENDING;
        boolean bond = arrival != null && (
                Boolean.TRUE.equals(arrival.getSecurityBondPurchased()) || arrival.isBondArranged());
        boolean insurance = arrival != null && (
                Boolean.TRUE.equals(arrival.getMedicalInsuranceRecorded()) || arrival.isInsuranceArranged());
        boolean pcp = arrival != null && Boolean.TRUE.equals(arrival.getPcpRecorded());
        boolean housingMom = arrival != null && (
                Boolean.TRUE.equals(arrival.getMomAddressRegistered()) || arrival.isHousingConfirmed());
        boolean ipa = wp != null && wp.getIpaNumber() != null && !wp.getIpaNumber().isBlank()
                && wp.getIpaIssueDate() != null && wp.getIpaExpiryDate() != null;
        boolean onboard = programmeDone(co.getOnboardProgrammeStatus());
        boolean sip = programmeDone(co.getSipStatus());
        boolean safety = programmeDone(co.getConstructionSafetyStatus());
        boolean tpValid = wp != null && wp.isTpValid()
                && (wp.getTpExpiryDate() == null || !wp.getTpExpiryDate().isBefore(LocalDate.now()));
        boolean wpIssued = wp != null && wp.getWpNumber() != null && !wp.getWpNumber().isBlank();
        boolean arrivalConfirmed = arrival != null
                && (arrival.isEmployeeConfirmed() || arrival.getActualArrivalDate() != null);
        boolean contractAcked = ackRepository.findByOnboardingIdAndAckType(co.getId(), "CONTRACT")
                .map(EmployeeAcknowledgementEntity::isAcknowledged)
                .orElse(false);
        List<PpeIssuanceEntity> ppe = ppeRepository.findByOnboardingId(co.getId());
        boolean ppeConfirmed = !ppe.isEmpty()
                && ppe.stream().allMatch(PpeIssuanceEntity::isEmployeeConfirmed)
                && co.getPpePhotoDocumentId() != null;
        boolean ppePhotoVerified = co.getPpeHrVerifiedAt() != null
                || taskRepository.findByOnboardingIdAndTaskCode(co.getId(), "SG_PPE_PHOTO_VERIFIED")
                .map(t -> t.getStatus() == OnboardingTaskStatus.COMPLETED)
                .orElse(false);
        boolean inductionDone = taskRepository.findByOnboardingIdAndTaskCode(co.getId(), "INDUCTION")
                .map(t -> t.getStatus() == OnboardingTaskStatus.COMPLETED
                        || t.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE)
                .orElse(false);
        boolean accountActive = appUserRepository.findByEmployeeId(employeeId)
                .map(u -> u.isActive())
                .orElse(false);
        boolean employeeOnboarded = co.getPipelineStatus() == PipelineStatus.READY_TO_WORK
                && taskRepository.findByOnboardingIdAndTaskCode(co.getId(), "SG_EMPLOYEE_ONBOARDED")
                .map(t -> t.getStatus() == OnboardingTaskStatus.COMPLETED)
                .orElse(false);
        // Prefer explicit ONBOARDED when present (additive enum value)
        try {
            if (co.getPipelineStatus() != null && "ONBOARDED".equals(co.getPipelineStatus().name())) {
                employeeOnboarded = true;
            }
        } catch (Exception ignored) {
            // enum may not yet include ONBOARDED in older deploys
        }
        return new StepState(
                bond,
                insurance,
                pcp,
                housingMom,
                ipa,
                wp != null ? wp.getIpaExtensionRequested() : null,
                onboard,
                sip,
                fit,
                unfit,
                medicalPending,
                safety,
                tpValid,
                wpIssued,
                arrivalConfirmed,
                contractAcked,
                ppeConfirmed,
                ppePhotoVerified,
                inductionDone,
                accountActive,
                employeeOnboarded
        );
    }

    public OnboardingSgFlowDto buildDto(EmployeeEntity employee, CandidateOnboardingEntity co, boolean includeSensitive) {
        if (!enabled()) {
            return null;
        }
        WorkerContext ctx = workerContext(employee, co);
        StepState state = stepState(employee.getId(), co);
        List<String> wpBlockers = OnboardingSgFlowRules.wpIssuanceBlockers(ctx, state);
        OnboardingGateCalculator.GateSnapshot gate =
                OnboardingGateCalculator.compute(OnboardingSgFlowRules.fullGateItems(ctx, state));
        List<String> readyBlockers = gate.stillRequired();
        WorkPassRecordEntity wp = workPassRecordRepository.findByEmployeeId(employee.getId()).orElse(null);
        List<String> deadlines = OnboardingSgFlowRules.deadlineWarnings(
                ctx,
                LocalDate.now(),
                wp != null ? wp.getIpaExpiryDate() : null,
                state.medicalFit() || state.medicalUnfit(),
                state.sipDone(),
                state.onboardCentreDone()
        );
        List<String> codes = gate.applicableItems().stream()
                .map(OnboardingGateCalculator.GateItem::code)
                .toList();
        String finMasked = maskId(employee.getFinNumber());
        String passportMasked = maskId(employee.getPassportNumber());
        if (includeSensitive && wp != null && wp.getFinNumber() != null) {
            finMasked = maskId(wp.getFinNumber());
        }
        return new OnboardingSgFlowDto(
                true,
                gate.ready(),
                state.medicalUnfit() || !gate.ready(),
                !wpBlockers.isEmpty(),
                state.medicalUnfit() ? OnboardingSgFlowRules.MEDICAL_UNFIT_WARNING : null,
                wpBlockers,
                readyBlockers,
                deadlines,
                codes,
                new OnboardingSgFlowDto.WorkerFields(
                        employee.getNationality(),
                        employee.getNationalityCode(),
                        employee.getGender(),
                        ctx.sector(),
                        ctx.workerCategory(),
                        ctx.accommodationType(),
                        ctx.dormCapacity(),
                        ctx.workPassApplicationDate(),
                        ctx.arrivalDate(),
                        OnboardingSgFlowRules.isMalaysian(ctx),
                        OnboardingSgFlowRules.isCmpSector(ctx),
                        OnboardingSgFlowRules.isConstructionSector(ctx),
                        OnboardingSgFlowRules.isManufacturingSector(ctx),
                        OnboardingSgFlowRules.pcpRequired(ctx)
                ),
                new OnboardingSgFlowDto.ComplianceFields(
                        arrivalFlag(employee.getId(), "bond"),
                        arrivalFlag(employee.getId(), "insurance"),
                        arrivalFlag(employee.getId(), "pcp"),
                        arrivalFlag(employee.getId(), "mom"),
                        wp != null ? wp.getIpaExtensionRequested() : null,
                        co.getConstructionSafetyStatus() != null ? co.getConstructionSafetyStatus().name() : null,
                        wp != null ? wp.getTpNumber() : null,
                        wp != null ? wp.getTpIssueDate() : null,
                        wp != null ? wp.getTpExpiryDate() : null,
                        wp != null && wp.isTpValid(),
                        finMasked,
                        passportMasked
                ),
                gate.label(),
                gate.progressPercent()
        );
    }

    public OnboardingGateCalculator.GateSnapshot gateSnapshot(EmployeeEntity employee, CandidateOnboardingEntity co) {
        WorkerContext ctx = workerContext(employee, co);
        StepState state = stepState(employee.getId(), co);
        return OnboardingGateCalculator.compute(OnboardingSgFlowRules.fullGateItems(ctx, state));
    }

    public List<String> extraReadyBlockers(EmployeeEntity employee, CandidateOnboardingEntity co) {
        if (!enabled()) {
            return List.of();
        }
        return gateSnapshot(employee, co).stillRequired();
    }

    public List<String> wpIssuanceBlockers(EmployeeEntity employee, CandidateOnboardingEntity co) {
        if (!enabled()) {
            return List.of();
        }
        return OnboardingSgFlowRules.wpIssuanceBlockers(workerContext(employee, co), stepState(employee.getId(), co));
    }

    public void markTask(UUID onboardingId, String code, OnboardingTaskStatus status, UUID actor, String warning) {
        taskRepository.findByOnboardingIdAndTaskCode(onboardingId, code).ifPresent(task -> {
            if (!task.isApplies() && status != OnboardingTaskStatus.NOT_APPLICABLE) {
                return;
            }
            OnboardingTaskStatus from = task.getStatus();
            task.setStatus(status);
            if (status == OnboardingTaskStatus.COMPLETED) {
                task.setCompletedAt(Instant.now());
                task.setCompletedByUserId(actor);
            }
            task.setWarningText(warning);
            taskRepository.save(task);
            // status change audited by caller
            if (from != status) {
                task.setNotes((task.getNotes() == null ? "" : task.getNotes() + " ")
                        + "status " + from + "->" + status);
            }
        });
    }

    public static boolean programmeDone(ProgrammeOutcome o) {
        return o == ProgrammeOutcome.COMPLETED
                || o == ProgrammeOutcome.NOT_APPLICABLE
                || o == ProgrammeOutcome.FIT;
    }

    public static String maskId(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim().toUpperCase(Locale.ROOT);
        if (trimmed.length() < 5) {
            return "XXXXXXX";
        }
        return trimmed.charAt(0) + "XXXX" + trimmed.substring(trimmed.length() - 4);
    }

    private void syncExistingWpTask(CandidateOnboardingEntity co, WorkerContext ctx) {
        taskRepository.findByOnboardingIdAndTaskCode(co.getId(), SgStep.WP_ISSUANCE.taskCode()).ifPresent(t -> {
            boolean applies = OnboardingSgFlowRules.applies(SgStep.WP_ISSUANCE, ctx);
            t.setApplies(applies);
            t.setMandatory(applies);
            taskRepository.save(t);
        });
    }

    private void syncTaskCompletionFromRecords(UUID employeeId, CandidateOnboardingEntity co, WorkerContext ctx) {
        StepState state = stepState(employeeId, co);
        syncOne(co.getId(), SgStep.SECURITY_BOND, ctx, state.securityBondPurchased());
        boolean pcpOk = state.medicalInsuranceRecorded()
                && (!OnboardingSgFlowRules.pcpRequired(ctx) || state.pcpRecorded());
        syncOne(co.getId(), SgStep.PCP_INSURANCE, ctx, pcpOk);
        syncOne(co.getId(), SgStep.HOUSING_MOM, ctx, state.housingMomRegistered());
        syncOne(co.getId(), SgStep.IPA_RECORD, ctx, state.ipaRecorded());
        syncOne(co.getId(), SgStep.ONBOARD_CENTRE, ctx, state.onboardCentreDone());
        syncOne(co.getId(), SgStep.SIP, ctx, state.sipDone());
        if (state.medicalUnfit()) {
            taskRepository.findByOnboardingIdAndTaskCode(co.getId(), SgStep.MEDICAL_EXAM.taskCode()).ifPresent(t -> {
                if (OnboardingSgFlowRules.applies(SgStep.MEDICAL_EXAM, ctx)) {
                    t.setApplies(true);
                    t.setStatus(OnboardingTaskStatus.BLOCKED);
                    t.setWarningText(OnboardingSgFlowRules.MEDICAL_UNFIT_WARNING);
                    taskRepository.save(t);
                }
            });
        } else {
            syncOne(co.getId(), SgStep.MEDICAL_EXAM, ctx, state.medicalFit());
        }
        syncOne(co.getId(), SgStep.CONSTRUCTION_SAFETY, ctx, state.constructionSafetyDone());
        syncOne(co.getId(), SgStep.TEMPORARY_PERMIT, ctx, state.temporaryPermitValid() || state.workPermitIssued());
    }

    private void syncOne(UUID onboardingId, SgStep step, WorkerContext ctx, boolean done) {
        taskRepository.findByOnboardingIdAndTaskCode(onboardingId, step.taskCode()).ifPresent(t -> {
            boolean applies = OnboardingSgFlowRules.applies(step, ctx);
            t.setApplies(applies);
            t.setMandatory(applies);
            if (!applies) {
                t.setStatus(OnboardingTaskStatus.NOT_APPLICABLE);
                t.setWarningText(null);
            } else if (done) {
                t.setStatus(OnboardingTaskStatus.COMPLETED);
                if (t.getCompletedAt() == null) {
                    t.setCompletedAt(Instant.now());
                }
                t.setWarningText(null);
            } else if (t.getStatus() != OnboardingTaskStatus.BLOCKED) {
                t.setStatus(OnboardingTaskStatus.PENDING);
            }
            taskRepository.save(t);
        });
    }

    private Boolean arrivalFlag(UUID employeeId, String which) {
        ArrivalRecordEntity a = arrivalRepository.findByEmployeeId(employeeId).orElse(null);
        if (a == null) {
            return null;
        }
        return switch (which) {
            case "bond" -> a.getSecurityBondPurchased() != null ? a.getSecurityBondPurchased() : a.isBondArranged();
            case "insurance" -> a.getMedicalInsuranceRecorded() != null
                    ? a.getMedicalInsuranceRecorded() : a.isInsuranceArranged();
            case "pcp" -> a.getPcpRecorded();
            case "mom" -> a.getMomAddressRegistered() != null ? a.getMomAddressRegistered() : a.isHousingConfirmed();
            default -> null;
        };
    }

    private static PipelineStatus stageFor(SgStep step) {
        return switch (step) {
            case SECURITY_BOND, PCP_INSURANCE, HOUSING_MOM -> PipelineStatus.PRE_ARRIVAL_PENDING;
            case IPA_RECORD -> PipelineStatus.IPA_APPROVED;
            case ONBOARD_CENTRE, SIP, MEDICAL_EXAM, CONSTRUCTION_SAFETY, TEMPORARY_PERMIT ->
                    PipelineStatus.POST_ARRIVAL_PENDING;
            case WP_ISSUANCE -> PipelineStatus.WORK_PERMIT_ISSUED;
            case PPE_PHOTO_VERIFIED, EMPLOYEE_ONBOARDED -> PipelineStatus.ONBOARDING_IN_PROGRESS;
        };
    }
}
