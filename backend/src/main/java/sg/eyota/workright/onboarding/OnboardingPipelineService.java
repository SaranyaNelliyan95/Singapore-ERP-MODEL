package sg.eyota.workright.onboarding;

import java.nio.file.Files;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.enrollment.EnrollmentService;
import sg.eyota.workright.enrollment.dto.EnrollmentResponse;
import sg.eyota.workright.onboarding.dto.OnboardingActivateResponse;
import sg.eyota.workright.onboarding.dto.OnboardingCandidateDto;
import sg.eyota.workright.onboarding.dto.OnboardingDetailDto;
import sg.eyota.workright.onboarding.dto.OnboardingDocumentDto;
import sg.eyota.workright.onboarding.dto.OnboardingLatestRequestDto;
import sg.eyota.workright.onboarding.dto.OnboardingSummaryDto;
import sg.eyota.workright.onboarding.dto.OnboardingTaskDto;
import sg.eyota.workright.onboarding.dto.PipelineActionRequests;
import sg.eyota.workright.onboarding.entity.ArrivalRecordEntity;
import sg.eyota.workright.onboarding.entity.CandidateOnboardingEntity;
import sg.eyota.workright.onboarding.entity.EmployeeAcknowledgementEntity;
import sg.eyota.workright.onboarding.entity.OnboardingAppointmentEntity;
import sg.eyota.workright.onboarding.entity.OnboardingAuditLogEntity;
import sg.eyota.workright.onboarding.entity.OnboardingDocType;
import sg.eyota.workright.onboarding.entity.OnboardingDocumentEntity;
import sg.eyota.workright.onboarding.entity.OnboardingSecureLinkEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskStatus;
import sg.eyota.workright.onboarding.entity.PipelineStatus;
import sg.eyota.workright.onboarding.entity.PpeIssuanceEntity;
import sg.eyota.workright.onboarding.entity.ProgrammeOutcome;
import sg.eyota.workright.onboarding.entity.WorkPassApplicationEntity;
import sg.eyota.workright.onboarding.entity.WorkPassRecordEntity;
import sg.eyota.workright.onboarding.repository.ArrivalRecordRepository;
import sg.eyota.workright.onboarding.repository.CandidateOnboardingRepository;
import sg.eyota.workright.onboarding.repository.EmployeeAcknowledgementRepository;
import sg.eyota.workright.onboarding.repository.OnboardingAppointmentRepository;
import sg.eyota.workright.onboarding.repository.OnboardingAuditLogRepository;
import sg.eyota.workright.onboarding.repository.OnboardingDocumentRepository;
import sg.eyota.workright.onboarding.repository.OnboardingSecureLinkRepository;
import sg.eyota.workright.onboarding.repository.OnboardingTaskRepository;
import sg.eyota.workright.onboarding.repository.PpeIssuanceRepository;
import sg.eyota.workright.onboarding.repository.WorkPassApplicationRepository;
import sg.eyota.workright.onboarding.repository.WorkPassRecordRepository;
import sg.eyota.workright.onboarding.notify.OnboardingSecureLinkService;
import sg.eyota.workright.onboarding.sg.OnboardingGateCalculator;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowRules;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowService;
import sg.eyota.workright.onboarding.storage.OnboardingFileStorage;
import sg.eyota.workright.common.model.UserRole;
import sg.eyota.workright.security.SecurityUtils;
import sg.eyota.workright.security.WorkrightUserDetails;

@Service
public class OnboardingPipelineService {

    private static final List<PipelineStatus> FOREIGN_FLOW = List.of(
            PipelineStatus.DRAFT,
            PipelineStatus.DOCUMENTS_PENDING,
            PipelineStatus.APPLICATION_SUBMITTED,
            PipelineStatus.IPA_APPROVED,
            PipelineStatus.PRE_ARRIVAL_PENDING,
            PipelineStatus.READY_FOR_TRAVEL,
            PipelineStatus.ARRIVED_IN_SINGAPORE,
            PipelineStatus.POST_ARRIVAL_PENDING,
            PipelineStatus.WORK_PERMIT_ISSUED,
            PipelineStatus.ONBOARDING_IN_PROGRESS,
            PipelineStatus.READY_TO_WORK
    );

    private static final List<PipelineStatus> LOCAL_FLOW = List.of(
            PipelineStatus.DRAFT,
            PipelineStatus.DOCUMENTS_PENDING,
            PipelineStatus.APPLICATION_SUBMITTED,
            PipelineStatus.POST_ARRIVAL_PENDING,
            PipelineStatus.ONBOARDING_IN_PROGRESS,
            PipelineStatus.READY_TO_WORK
    );

    private static final Set<String> FOREIGN_PASSES = Set.of("WP", "S PASS", "EP", "WORK PERMIT");

    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final CandidateOnboardingRepository onboardingRepository;
    private final WorkPassApplicationRepository applicationRepository;
    private final OnboardingDocumentRepository documentRepository;
    private final OnboardingTaskRepository taskRepository;
    private final ArrivalRecordRepository arrivalRepository;
    private final OnboardingAppointmentRepository appointmentRepository;
    private final WorkPassRecordRepository workPassRecordRepository;
    private final PpeIssuanceRepository ppeRepository;
    private final EmployeeAcknowledgementRepository ackRepository;
    private final OnboardingAuditLogRepository auditRepository;
    private final OnboardingChecklistFactory checklistFactory;
    private final OnboardingFileStorage fileStorage;
    private final OnboardingMailNotifier mailNotifier;
    private final EnrollmentService enrollmentService;
    private final OnboardingSgFlowService sgFlowService;
    private final OnboardingSecureLinkService secureLinkService;
    private final OnboardingSecureLinkRepository secureLinkRepository;

    public OnboardingPipelineService(
            EmployeeRepository employeeRepository,
            AppUserRepository appUserRepository,
            CandidateOnboardingRepository onboardingRepository,
            WorkPassApplicationRepository applicationRepository,
            OnboardingDocumentRepository documentRepository,
            OnboardingTaskRepository taskRepository,
            ArrivalRecordRepository arrivalRepository,
            OnboardingAppointmentRepository appointmentRepository,
            WorkPassRecordRepository workPassRecordRepository,
            PpeIssuanceRepository ppeRepository,
            EmployeeAcknowledgementRepository ackRepository,
            OnboardingAuditLogRepository auditRepository,
            OnboardingChecklistFactory checklistFactory,
            OnboardingFileStorage fileStorage,
            OnboardingMailNotifier mailNotifier,
            EnrollmentService enrollmentService,
            OnboardingSgFlowService sgFlowService,
            OnboardingSecureLinkService secureLinkService,
            OnboardingSecureLinkRepository secureLinkRepository
    ) {
        this.employeeRepository = employeeRepository;
        this.appUserRepository = appUserRepository;
        this.onboardingRepository = onboardingRepository;
        this.applicationRepository = applicationRepository;
        this.documentRepository = documentRepository;
        this.taskRepository = taskRepository;
        this.arrivalRepository = arrivalRepository;
        this.appointmentRepository = appointmentRepository;
        this.workPassRecordRepository = workPassRecordRepository;
        this.ppeRepository = ppeRepository;
        this.ackRepository = ackRepository;
        this.auditRepository = auditRepository;
        this.checklistFactory = checklistFactory;
        this.fileStorage = fileStorage;
        this.mailNotifier = mailNotifier;
        this.enrollmentService = enrollmentService;
        this.sgFlowService = sgFlowService;
        this.secureLinkService = secureLinkService;
        this.secureLinkRepository = secureLinkRepository;
    }

    public static boolean isForeignPass(String passType) {
        if (passType == null || passType.isBlank()) {
            return false;
        }
        return FOREIGN_PASSES.contains(passType.trim().toUpperCase(Locale.ROOT));
    }

    @Transactional
    public CandidateOnboardingEntity ensureOnboarding(EmployeeEntity employee, UUID actorUserId) {
        return onboardingRepository.findByEmployeeId(employee.getId()).orElseGet(() -> {
            boolean foreign = isForeignPass(employee.getWorkPassType());
            CandidateOnboardingEntity co = new CandidateOnboardingEntity();
            co.setEmployeeId(employee.getId());
            co.setPassType(employee.getWorkPassType());
            co.setWorkerCategory(employee.getWorkerCategory());
            co.setSector(employee.getSector());
            co.setForeignWorker(foreign);
            co.setPipelineStatus(employee.getPipelineStatus() != null
                    ? employee.getPipelineStatus()
                    : PipelineStatus.DRAFT);
            co.setChecklistProgress(employee.getOnboardingProgress());
            if (!foreign) {
                co.setMedicalStatus(ProgrammeOutcome.NOT_APPLICABLE);
                co.setSipStatus(ProgrammeOutcome.NOT_APPLICABLE);
                co.setOnboardProgrammeStatus(ProgrammeOutcome.NOT_APPLICABLE);
            }
            co.setQuarantineStatus(ProgrammeOutcome.NOT_APPLICABLE);
            co.setCreatedByUserId(actorUserId);
            co = onboardingRepository.save(co);
            taskRepository.saveAll(checklistFactory.build(employee.getId(), co.getId(), foreign));
            audit(employee.getId(), co.getId(), actorUserId, "ONBOARDING_INITIALIZED",
                    null, co.getPipelineStatus().name(), "Candidate onboarding record created");
            if (sgFlowService.enabled()) {
                sgFlowService.ensureSgTasks(employee, co);
            }
            return co;
        });
    }

    @Transactional(readOnly = true)
    public OnboardingSummaryDto summary() {
        List<OnboardingCandidateDto> candidates = listCandidates();
        return new OnboardingSummaryDto(
                candidates.size(),
                countPipeline(candidates, PipelineStatus.DRAFT, PipelineStatus.DOCUMENTS_PENDING),
                countPipeline(candidates, PipelineStatus.APPLICATION_SUBMITTED, PipelineStatus.IPA_APPROVED),
                countPipeline(candidates,
                        PipelineStatus.PRE_ARRIVAL_PENDING,
                        PipelineStatus.READY_FOR_TRAVEL,
                        PipelineStatus.ARRIVED_IN_SINGAPORE,
                        PipelineStatus.POST_ARRIVAL_PENDING),
                countPipeline(candidates,
                        PipelineStatus.WORK_PERMIT_ISSUED,
                        PipelineStatus.ONBOARDING_IN_PROGRESS),
                candidates
        );
    }

    @Transactional(readOnly = true)
    public List<OnboardingCandidateDto> listCandidates() {
        Instant retainAfter = Instant.now().minus(7, ChronoUnit.DAYS);
        return employeeRepository
                .findOnboardingPipeline(
                        EmployeeEntity.OnboardingStage.COMPLETED,
                        EmployeeEntity.EmploymentStatus.PENDING,
                        PipelineStatus.READY_TO_WORK)
                .stream()
                .filter(e -> e.getEmploymentStatus() != EmployeeEntity.EmploymentStatus.TERMINATED
                        && e.getEmploymentStatus() != EmployeeEntity.EmploymentStatus.RESIGNED)
                .filter(e -> keepInActiveOnboardingList(e, retainAfter))
                .sorted(Comparator
                        .comparing((EmployeeEntity e) -> {
                            CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(e.getId()).orElse(null);
                            return co != null && co.getPipelineStatus() == PipelineStatus.READY_TO_WORK;
                        })
                        .thenComparing(EmployeeEntity::getDateOfJoining, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(EmployeeEntity::getFullName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .map(this::toCandidateDto)
                .toList();
    }

    /**
     * Active pipeline candidates stay listed. Ready-to-Work stays for 7 days after completion,
     * then drops off the HR Active candidates queue.
     */
    private boolean keepInActiveOnboardingList(EmployeeEntity e, Instant retainAfter) {
        if (e.getPipelineStatus() != PipelineStatus.READY_TO_WORK) {
            return true;
        }
        CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(e.getId()).orElse(null);
        Instant completedAt = co != null ? co.getReadyToWorkAt() : null;
        if (completedAt == null && co != null && co.getUpdatedAt() != null) {
            completedAt = co.getUpdatedAt();
        }
        return completedAt != null && !completedAt.isBefore(retainAfter);
    }

    /** HR dashboard notification feed — pending actions such as PPE photo verification. */
    @Transactional(readOnly = true)
    public List<OnboardingLatestRequestDto> latestRequests() {
        List<OnboardingLatestRequestDto> items = new ArrayList<>();
        for (CandidateOnboardingEntity co :
                onboardingRepository.findByPpePhotoDocumentIdIsNotNullAndPpeHrVerifiedAtIsNull()) {
            EmployeeEntity e = employeeRepository.findById(co.getEmployeeId()).orElse(null);
            if (e == null) {
                continue;
            }
            OnboardingDocumentEntity doc = documentRepository.findById(co.getPpePhotoDocumentId()).orElse(null);
            Instant created = doc != null && doc.getCreatedAt() != null ? doc.getCreatedAt() : co.getUpdatedAt();
            items.add(new OnboardingLatestRequestDto(
                    "PPE_PHOTO_VERIFY",
                    "PPE photo verification",
                    e.getFullName() + " uploaded a PPE receipt photo awaiting HR verification.",
                    e.getId(),
                    e.getEmployeeCode(),
                    e.getFullName(),
                    co.getPpePhotoDocumentId(),
                    doc != null ? doc.getFileName() : null,
                    doc != null ? doc.getContentType() : null,
                    created,
                    "Verify photo"));
        }
        items.sort(Comparator.comparing(
                OnboardingLatestRequestDto::createdAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return items;
    }

    /**
     * Employee dashboard Latest requests — mirrors confirmation emails HR already sent
     * (ARRIVAL / CONTRACT / PPE secure links). Emails are unchanged; this is an additional in-app feed.
     */
    @Transactional(readOnly = true)
    public List<OnboardingLatestRequestDto> employeeLatestRequests(UUID employeeId) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(employeeId).orElse(null);
        if (co == null) {
            return List.of();
        }

        boolean arrivalDone = taskRepository.findByOnboardingIdAndTaskCode(co.getId(), "ARRIVAL")
                .map(t -> t.getStatus() == OnboardingTaskStatus.COMPLETED
                        || t.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE)
                .orElse(false)
                || arrivalRepository.findByEmployeeId(employeeId)
                .map(ArrivalRecordEntity::isEmployeeConfirmed)
                .orElse(false)
                || EnumSet.of(
                        PipelineStatus.ARRIVED_IN_SINGAPORE,
                        PipelineStatus.POST_ARRIVAL_PENDING,
                        PipelineStatus.WORK_PERMIT_ISSUED,
                        PipelineStatus.ONBOARDING_IN_PROGRESS,
                        PipelineStatus.READY_TO_WORK
                ).contains(co.getPipelineStatus());

        boolean contractAcked = ackRepository.findByOnboardingIdAndAckType(co.getId(), "CONTRACT")
                .map(EmployeeAcknowledgementEntity::isAcknowledged)
                .orElse(false)
                || taskRepository.findByOnboardingIdAndTaskCode(co.getId(), "CONTRACT_ACK")
                .map(t -> t.getStatus() == OnboardingTaskStatus.COMPLETED
                        || t.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE)
                .orElse(false);

        boolean ppeConfirmed = taskRepository.findByOnboardingIdAndTaskCode(co.getId(), "PPE_CONFIRM")
                .map(t -> t.getStatus() == OnboardingTaskStatus.COMPLETED
                        || t.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE)
                .orElse(false)
                || (co.getPpePhotoDocumentId() != null
                && ppeRepository.findByOnboardingId(co.getId()).stream()
                .anyMatch(PpeIssuanceEntity::isEmployeeConfirmed));

        // One open link per action type (newest first) — same actions that trigger the emails.
        List<OnboardingSecureLinkEntity> openLinks = secureLinkRepository
                .findByEmployeeIdAndRevokedAtIsNullAndUsedAtIsNull(employeeId);
        openLinks.sort(Comparator.comparing(
                OnboardingSecureLinkEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        List<OnboardingLatestRequestDto> items = new ArrayList<>();
        boolean sawArrival = false;
        boolean sawContract = false;
        boolean sawPpe = false;
        for (OnboardingSecureLinkEntity link : openLinks) {
            String action = link.getActionType() == null ? "" : link.getActionType().toUpperCase(Locale.ROOT);
            if (OnboardingSecureLinkService.ACTION_ARRIVAL.equals(action)) {
                if (sawArrival || arrivalDone) {
                    continue;
                }
                sawArrival = true;
                items.add(new OnboardingLatestRequestDto(
                        "ARRIVAL_CONFIRM",
                        "Confirm arrival in Singapore",
                        "HR asked you to confirm you have arrived and housing is correct. "
                                + "Confirm here or use My onboarding — email / WhatsApp link still works.",
                        employee.getId(),
                        employee.getEmployeeCode(),
                        employee.getFullName(),
                        null,
                        null,
                        null,
                        link.getCreatedAt(),
                        "Confirm arrival"));
            } else if (OnboardingSecureLinkService.ACTION_CONTRACT.equals(action)) {
                if (sawContract || contractAcked) {
                    continue;
                }
                sawContract = true;
                items.add(new OnboardingLatestRequestDto(
                        "CONTRACT_CONFIRM",
                        "Action required: confirm your onboarding step",
                        "HR sent a contract acknowledgement request. Open My onboarding to acknowledge — "
                                + "you can also use the email / WhatsApp link.",
                        employee.getId(),
                        employee.getEmployeeCode(),
                        employee.getFullName(),
                        null,
                        null,
                        null,
                        link.getCreatedAt(),
                        "Acknowledge contract"));
            } else if (OnboardingSecureLinkService.ACTION_PPE.equals(action)) {
                if (sawPpe || ppeConfirmed) {
                    continue;
                }
                sawPpe = true;
                items.add(new OnboardingLatestRequestDto(
                        "PPE_CONFIRM",
                        "Action required: confirm PPE received",
                        "HR issued your PPE kit and sent a confirmation request. Upload your PPE photo "
                                + "in My onboarding — the email / WhatsApp link still works.",
                        employee.getId(),
                        employee.getEmployeeCode(),
                        employee.getFullName(),
                        null,
                        null,
                        null,
                        link.getCreatedAt(),
                        "Confirm PPE"));
            }
        }
        items.sort(Comparator.comparing(
                OnboardingLatestRequestDto::createdAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return items;
    }

    @Transactional
    public OnboardingDetailDto detail(UUID employeeId) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, null);
        syncAccountActivateFromLogin(employeeId, co);
        if (sgFlowService.enabled()) {
            sgFlowService.ensureSgTasks(employee, co);
            refreshChecklistProgress(employee, co);
        }
        return toDetail(employee, co, true);
    }

    @Transactional
    public OnboardingDetailDto employeeSelfDetail(UUID employeeId) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found",
                        "No onboarding pipeline for this account"));
        syncAccountActivateFromLogin(employeeId, co);
        if (sgFlowService.enabled()) {
            sgFlowService.ensureSgTasks(employee, co);
            refreshChecklistProgress(employee, co);
        }
        return toDetail(employee, co, false);
    }

    @Transactional
    public OnboardingCandidateDto advance(UUID employeeId, UUID actorUserId) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actorUserId);
        if (co.getPipelineStatus() == PipelineStatus.CANCELLED || co.getPipelineStatus() == PipelineStatus.ON_HOLD) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                    "Cannot advance while status is " + co.getPipelineStatus());
        }
        if (co.getPipelineStatus() == PipelineStatus.READY_TO_WORK) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Already Ready to Work");
        }
        List<PipelineStatus> flow = co.isForeignWorker() ? FOREIGN_FLOW : LOCAL_FLOW;
        int idx = flow.indexOf(co.getPipelineStatus());
        if (idx < 0) {
            idx = 0;
        }
        PipelineStatus next = flow.get(Math.min(idx + 1, flow.size() - 1));
        if (next == PipelineStatus.READY_TO_WORK) {
            List<String> blockers = readinessBlockers(co, employeeId);
            if (!blockers.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Not Ready",
                        "Cannot mark Ready to Work: " + String.join("; ", blockers));
            }
        }
        applyStatus(employee, co, next, actorUserId, "ADVANCE", null);
        maybeAutoProvisionOnReady(employee, co, actorUserId, true);
        return toCandidateDto(employeeRepository.findById(employeeId).orElse(employee));
    }

    @Transactional
    public OnboardingDetailDto setStatus(UUID employeeId, PipelineActionRequests.SetStatusRequest request, UUID actor) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        PipelineStatus target = parseStatus(request.status());
        if ((target == PipelineStatus.CANCELLED || target == PipelineStatus.ON_HOLD || request.forceOverride())
                && (request.reason() == null || request.reason().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Reason is required for this status change");
        }
        if (target == PipelineStatus.READY_TO_WORK && !request.forceOverride()) {
            List<String> blockers = readinessBlockers(co, employeeId);
            if (!blockers.isEmpty()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Not Ready",
                        "Blocked: " + String.join("; ", blockers));
            }
        }
        if (request.forceOverride()) {
            // HR_ADMIN privilege maps to ADMIN role in this system
            requireHrAdminForOverride();
            if (request.reason() == null || request.reason().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                        "Mandatory reason required for Ready-to-Work override");
            }
            co.setOverrideReason(request.reason());
            audit(employeeId, co.getId(), actor, "READY_GATE_OVERRIDE",
                    co.getPipelineStatus().name(), target.name(), request.reason());
        }
        applyStatus(employee, co, target, actor, request.forceOverride() ? "MANUAL_OVERRIDE" : "SET_STATUS",
                request.reason());
        return detail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto recordMomApplication(
            UUID employeeId, PipelineActionRequests.MomApplicationRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        WorkPassApplicationEntity app = new WorkPassApplicationEntity();
        app.setEmployeeId(employeeId);
        app.setOnboardingId(co.getId());
        app.setMomReference(request.momReference());
        app.setApplicationType(request.applicationType() != null ? request.applicationType() : "WORK_PASS");
        app.setSubmittedAt(request.submittedAt() != null ? request.submittedAt() : LocalDate.now());
        app.setSubmittedByUserId(actor);
        app.setPortalNotes(request.portalNotes());
        app.setStatus("SUBMITTED");
        applicationRepository.save(app);
        completeTask(co.getId(), "MOM_APPLICATION", actor);
        completeTask(co.getId(), "LOCAL_FORMS", actor);
        // Notify employee only on first transition into APPLICATION_SUBMITTED (not on every re-save)
        if (!isAtOrAfter(co.getPipelineStatus(), PipelineStatus.APPLICATION_SUBMITTED)) {
            applyStatus(employee, co, PipelineStatus.APPLICATION_SUBMITTED, actor, "MOM_APPLICATION",
                    request.momReference());
            mailNotifier.notifyStatus(employee, PipelineStatus.APPLICATION_SUBMITTED,
                    "HR recorded your work pass application in MOM portal (manual). Reference: "
                            + (request.momReference() != null ? request.momReference() : "n/a"));
        } else {
            audit(employeeId, co.getId(), actor, "MOM_APPLICATION_UPDATE", null, null,
                    request.momReference());
        }
        refreshChecklistProgress(employee, co);
        return detail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto recordIpa(
            UUID employeeId, PipelineActionRequests.IpaRecordRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        WorkPassRecordEntity wp = workPassRecordRepository.findByEmployeeId(employeeId).orElseGet(() -> {
            WorkPassRecordEntity n = new WorkPassRecordEntity();
            n.setEmployeeId(employeeId);
            n.setOnboardingId(co.getId());
            return n;
        });
        wp.setIpaNumber(request.ipaNumber());
        wp.setIpaIssueDate(request.ipaIssueDate());
        wp.setIpaExpiryDate(request.ipaExpiryDate());
        if (request.ipaExtensionRequested() != null) {
            wp.setIpaExtensionRequested(request.ipaExtensionRequested());
        }
        if (request.notes() != null) {
            wp.setNotes(request.notes());
        }
        workPassRecordRepository.save(wp);
        completeTask(co.getId(), "IPA_UPLOAD", actor);
        if (sgFlowService.enabled()) {
            sgFlowService.markTask(co.getId(), "SG_IPA_RECORD", OnboardingTaskStatus.COMPLETED, actor, null);
        }
        // Status advances automatically once IPA number is recorded; package email stays notify-once on markApproved.
        boolean hasIpa = request.ipaNumber() != null && !request.ipaNumber().isBlank();
        boolean advancedToIpa = false;
        if (hasIpa && !isAtOrAfter(co.getPipelineStatus(), PipelineStatus.IPA_APPROVED)) {
            applyStatus(employee, co, PipelineStatus.IPA_APPROVED, actor, "IPA_APPROVED", request.ipaNumber());
            advancedToIpa = true;
        }
        if (request.markApproved()) {
            boolean alreadyNotified = auditRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId).stream()
                    .anyMatch(a -> "IPA_PACKAGE_NOTIFIED".equals(a.getAction()));
            if (!alreadyNotified) {
                mailNotifier.notifyDocumentPackageReady(employee);
                audit(employeeId, co.getId(), actor, "IPA_PACKAGE_NOTIFIED", null, null, request.ipaNumber());
            } else if (!advancedToIpa) {
                audit(employeeId, co.getId(), actor, "IPA_UPDATE", null, null,
                        "IPA fields updated — employee already notified on first approval");
            }
        } else if (!advancedToIpa) {
            audit(employeeId, co.getId(), actor, "IPA_UPDATE", null, null, request.ipaNumber());
        }
        refreshChecklistProgress(employee, co);
        return detail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto updatePreArrival(
            UUID employeeId, PipelineActionRequests.PreArrivalRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        ArrivalRecordEntity arrival = arrivalRepository.findByEmployeeId(employeeId).orElseGet(() -> {
            ArrivalRecordEntity n = new ArrivalRecordEntity();
            n.setEmployeeId(employeeId);
            n.setOnboardingId(co.getId());
            return n;
        });
        arrival.setPlannedArrivalDate(request.plannedArrivalDate());
        arrival.setFlightNumber(request.flightNumber());
        arrival.setArrivalAirport(request.arrivalAirport());
        arrival.setAccommodationAddress(request.accommodationAddress());
        arrival.setHousingConfirmed(request.housingConfirmed());
        arrival.setBondArranged(request.bondArranged());
        arrival.setInsuranceArranged(request.insuranceArranged());
        arrival.setNotes(request.notes());
        if (request.accommodationType() != null) {
            arrival.setAccommodationType(request.accommodationType());
        }
        if (request.dormCapacity() != null) {
            arrival.setDormCapacity(request.dormCapacity());
        }
        if (request.momAddressRegistered() != null) {
            arrival.setMomAddressRegistered(request.momAddressRegistered());
        }
        if (request.pcpRecorded() != null) {
            arrival.setPcpRecorded(request.pcpRecorded());
        }
        if (request.medicalInsuranceRecorded() != null) {
            arrival.setMedicalInsuranceRecorded(request.medicalInsuranceRecorded());
        } else if (request.insuranceArranged()) {
            arrival.setMedicalInsuranceRecorded(true);
        }
        if (request.securityBondPurchased() != null) {
            arrival.setSecurityBondPurchased(request.securityBondPurchased());
        } else if (request.bondArranged()) {
            arrival.setSecurityBondPurchased(true);
        }
        arrivalRepository.save(arrival);
        completeTask(co.getId(), "PRE_ARRIVAL", actor);
        if (sgFlowService.enabled()) {
            sgFlowService.ensureSgTasks(employee, co);
        }
        PipelineStatus next = request.readyForTravel()
                ? PipelineStatus.READY_FOR_TRAVEL
                : PipelineStatus.PRE_ARRIVAL_PENDING;
        PipelineStatus from = co.getPipelineStatus();
        // Notify only when stage actually advances (not on every pre-arrival field update)
        if (from != next && !isAtOrAfter(from, next)) {
            applyStatus(employee, co, next, actor, "PRE_ARRIVAL", null);
            mailNotifier.notifyStatus(employee, next,
                    "Pre-arrival checklist updated. Planned arrival: "
                            + (request.plannedArrivalDate() != null ? request.plannedArrivalDate() : "TBC"));
        } else if (from != next && isAtOrAfter(from, next)) {
            // Already past this stage — keep data, do not regress or re-notify
            audit(employeeId, co.getId(), actor, "PRE_ARRIVAL_UPDATE", null, null, null);
        } else {
            audit(employeeId, co.getId(), actor, "PRE_ARRIVAL_UPDATE", null, null, null);
        }
        refreshChecklistProgress(employee, co);
        return detail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto updateArrival(
            UUID employeeId, PipelineActionRequests.ArrivalUpdateRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        ArrivalRecordEntity arrival = arrivalRepository.findByEmployeeId(employeeId).orElseGet(() -> {
            ArrivalRecordEntity n = new ArrivalRecordEntity();
            n.setEmployeeId(employeeId);
            n.setOnboardingId(co.getId());
            return n;
        });
        if (request.actualArrivalDate() != null) {
            arrival.setActualArrivalDate(request.actualArrivalDate());
        }
        if (request.flightNumber() != null) {
            arrival.setFlightNumber(request.flightNumber());
        }
        if (request.arrivalAirport() != null) {
            arrival.setArrivalAirport(request.arrivalAirport());
        }
        if (request.accommodationAddress() != null) {
            arrival.setAccommodationAddress(request.accommodationAddress());
        }
        arrival.setHousingConfirmed(request.housingConfirmed());
        arrival.setEmployeeConfirmed(request.employeeConfirmed());
        if (request.notes() != null) {
            arrival.setNotes(request.notes());
        }
        if (request.accommodationType() != null) {
            arrival.setAccommodationType(request.accommodationType());
        }
        if (request.dormCapacity() != null) {
            arrival.setDormCapacity(request.dormCapacity());
        }
        if (request.momAddressRegistered() != null) {
            arrival.setMomAddressRegistered(request.momAddressRegistered());
        }
        arrivalRepository.save(arrival);
        completeTask(co.getId(), "ARRIVAL", actor);
        if (sgFlowService.enabled()) {
            sgFlowService.ensureSgTasks(employee, co);
        }
        applyStatus(employee, co, PipelineStatus.ARRIVED_IN_SINGAPORE, actor, "ARRIVAL", null);
        if (request.actualArrivalDate() != null) {
            applyStatus(employee, co, PipelineStatus.POST_ARRIVAL_PENDING, actor, "POST_ARRIVAL",
                    "Actual arrival " + request.actualArrivalDate());
        }
        return detail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto addAppointment(
            UUID employeeId, PipelineActionRequests.AppointmentRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        OnboardingAppointmentEntity appt = new OnboardingAppointmentEntity();
        appt.setEmployeeId(employeeId);
        appt.setOnboardingId(co.getId());
        appt.setAppointmentType(request.appointmentType());
        appt.setScheduledAt(request.scheduledAt());
        appt.setLocation(request.location());
        appt.setOutcome(parseOutcome(request.outcome()));
        appt.setNotes(request.notes());
        appointmentRepository.save(appt);
        syncProgrammeFromAppointments(co);
        onboardingRepository.save(co);
        audit(employeeId, co.getId(), actor, "APPOINTMENT", null, null, request.appointmentType());
        return detail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto updateProgrammes(
            UUID employeeId, PipelineActionRequests.ProgrammeStatusRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        if (sgFlowService.enabled()) {
            ArrivalRecordEntity arrival = arrivalRepository.findByEmployeeId(employeeId).orElse(null);
            boolean hasArrival = arrival != null && arrival.getActualArrivalDate() != null;
            boolean completingProgramme =
                    isCompletingProgramme(request.medicalStatus())
                            || isCompletingProgramme(request.sipStatus())
                            || isCompletingProgramme(request.onboardProgrammeStatus())
                            || isCompletingProgramme(request.constructionSafetyStatus());
            if (completingProgramme && !hasArrival) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Arrival Required",
                        OnboardingSgFlowRules.arrivalRequiredMessage());
            }
        }
        if (request.medicalStatus() != null) {
            co.setMedicalStatus(parseOutcome(request.medicalStatus()));
        }
        if (request.sipStatus() != null) {
            co.setSipStatus(parseOutcome(request.sipStatus()));
        }
        if (request.onboardProgrammeStatus() != null) {
            co.setOnboardProgrammeStatus(parseOutcome(request.onboardProgrammeStatus()));
        }
        if (request.quarantineStatus() != null) {
            // Never force quarantine — allow N/A explicitly
            co.setQuarantineStatus(parseOutcome(request.quarantineStatus()));
        }
        if (request.constructionSafetyStatus() != null) {
            co.setConstructionSafetyStatus(parseOutcome(request.constructionSafetyStatus()));
        }
        if (programmeDone(co.getMedicalStatus()) && programmeDone(co.getSipStatus())
                && programmeDone(co.getOnboardProgrammeStatus())) {
            completeTask(co.getId(), "MEDICAL_SIP", actor);
        }
        onboardingRepository.save(co);
        String medicalDetail = "medical=" + co.getMedicalStatus();
        audit(employeeId, co.getId(), actor, "PROGRAMME_STATUS", null, null,
                medicalDetail + " / sip/onboard/quarantine/safety updated");
        if (sgFlowService.enabled()) {
            sgFlowService.ensureSgTasks(employee, co);
        }
        return detail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto issueWorkPermit(
            UUID employeeId, PipelineActionRequests.WorkPermitIssueRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        List<String> sgBlockers = sgFlowService.wpIssuanceBlockers(employee, co);
        if (!sgBlockers.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WP Issuance Blocked",
                    String.join("; ", sgBlockers));
        }
        WorkPassRecordEntity wp = workPassRecordRepository.findByEmployeeId(employeeId).orElseGet(() -> {
            WorkPassRecordEntity n = new WorkPassRecordEntity();
            n.setEmployeeId(employeeId);
            n.setOnboardingId(co.getId());
            return n;
        });
        wp.setWpNumber(request.wpNumber());
        wp.setWpIssueDate(request.wpIssueDate());
        wp.setWpExpiryDate(request.wpExpiryDate());
        wp.setFinNumber(request.finNumber());
        wp.setCardCollected(request.cardCollected());
        if (request.notes() != null) {
            wp.setNotes(request.notes());
        }
        workPassRecordRepository.save(wp);
        employee.setWorkPassNumber(request.wpNumber());
        employee.setWorkPassExpiry(request.wpExpiryDate());
        if (request.finNumber() != null) {
            employee.setFinNumber(request.finNumber());
        }
        employeeRepository.save(employee);
        completeTask(co.getId(), "WP_ISSUANCE", actor);
        applyStatus(employee, co, PipelineStatus.WORK_PERMIT_ISSUED, actor, "WP_ISSUED", request.wpNumber());
        applyStatus(employee, co, PipelineStatus.ONBOARDING_IN_PROGRESS, actor, "EMPLOYEE_ONBOARDING", null);
        mailNotifier.notifyStatus(employee, PipelineStatus.ONBOARDING_IN_PROGRESS,
                "Work permit recorded. Complete account activation, contract acknowledgement, and PPE confirmation.");
        return detail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto issuePpe(
            UUID employeeId, PipelineActionRequests.PpeIssueRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        Instant now = Instant.now();
        int created = 0;
        for (PipelineActionRequests.PpeIssueRequest.PpeItem item : request.items()) {
            String code = item.itemCode() != null ? item.itemCode().trim().toUpperCase(Locale.ROOT) : "";
            boolean exists = ppeRepository.findByOnboardingId(co.getId()).stream()
                    .anyMatch(p -> p.getItemCode() != null && p.getItemCode().equalsIgnoreCase(code));
            if (exists) {
                continue; // de-dupe by item code — do not create duplicate PPE rows
            }
            PpeIssuanceEntity ppe = new PpeIssuanceEntity();
            ppe.setEmployeeId(employeeId);
            ppe.setOnboardingId(co.getId());
            ppe.setItemCode(item.itemCode());
            ppe.setItemName(item.itemName());
            ppe.setQuantity(item.quantity() > 0 ? item.quantity() : 1);
            ppe.setIssuedAt(now);
            ppe.setIssuedByUserId(actor);
            ppeRepository.save(ppe);
            created++;
        }
        audit(employeeId, co.getId(), actor, "PPE_ISSUED", null, null,
                request.items().size() + " item(s)");
        // Auto-send PPE confirmation link (email + WhatsApp) only when new kit items are issued
        if (created > 0 && sgFlowService.enabled()) {
            try {
                secureLinkService.sendSingleLink(
                        employeeId, OnboardingSecureLinkService.ACTION_PPE, actor);
            } catch (ApiException ignored) {
                // Issuance still succeeds if notify fails (e.g. missing mobile/email)
            }
        }
        return detail(employeeId);
    }

    @Transactional
    public OnboardingActivateResponse completeReady(
            UUID employeeId, PipelineActionRequests.CompleteReadyRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        if (co.getPipelineStatus() == PipelineStatus.READY_TO_WORK) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Already Ready",
                    "This candidate is already marked Ready to Work.");
        }
        List<String> blockers = readinessBlockers(co, employeeId);
        if (!blockers.isEmpty() && (co.getOverrideReason() == null || co.getOverrideReason().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Not Ready",
                    "Cannot complete: " + String.join("; ", blockers));
        }
        applyStatus(employee, co, PipelineStatus.READY_TO_WORK, actor, "READY_TO_WORK", null);
        completeTask(co.getId(), "READY_TO_WORK", actor);
        completeTask(co.getId(), "INDUCTION", actor);

        String loginEmail = null;
        String inviteStatus = employee.getInvitationEmailStatus();
        String message = "Marked Ready to Work.";
        boolean createLogin = request.createLogin();
        if (createLogin) {
            String email = request.email() != null && !request.email().isBlank()
                    ? request.email()
                    : employee.getPersonalEmail();
            EnrollmentResponse invite = enrollmentService.provisionInvitation(employeeId, email, actor);
            loginEmail = invite.workEmail();
            inviteStatus = invite.invitationEmailStatus();
            message = invite.message();
            completeTask(co.getId(), "ACCOUNT_ACTIVATE", actor);
        }
        mailNotifier.notifyReadyToWork(employee);
        employee = employeeRepository.findById(employeeId).orElse(employee);
        return new OnboardingActivateResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                loginEmail,
                inviteStatus,
                message
        );
    }

    @Transactional
    public OnboardingDocumentDto uploadDocument(
            UUID employeeId,
            OnboardingDocType docType,
            MultipartFile file,
            LocalDate issueDate,
            LocalDate expiryDate,
            String visibility,
            UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        OnboardingFileStorage.StoredFile stored = fileStorage.store(employeeId, file);
        int version = documentRepository.countByOnboardingIdAndDocType(co.getId(), docType) + 1;
        OnboardingDocumentEntity doc = new OnboardingDocumentEntity();
        doc.setEmployeeId(employeeId);
        doc.setOnboardingId(co.getId());
        doc.setDocType(docType);
        doc.setFileName(stored.fileName());
        doc.setContentType(stored.contentType());
        doc.setStoragePath(stored.storagePath());
        doc.setSizeBytes(stored.sizeBytes());
        doc.setIssueDate(issueDate);
        doc.setExpiryDate(expiryDate);
        doc.setVersionNo(version);
        doc.setVisibility(visibility != null && !visibility.isBlank() ? visibility : defaultVisibility(docType));
        doc.setUploadedByUserId(actor);
        doc.setApprovalStatus("UPLOADED");
        doc = documentRepository.save(doc);
        if (docType == OnboardingDocType.PASSPORT || docType == OnboardingDocType.EMPLOYMENT_CONTRACT) {
            completeTask(co.getId(), "COLLECT_DOCS", actor);
            if (co.getPipelineStatus() == PipelineStatus.DRAFT) {
                applyStatus(employee, co, PipelineStatus.DOCUMENTS_PENDING, actor, "DOCS_UPLOADED", docType.name());
            }
        }
        if (docType == OnboardingDocType.IPA_FULL_SET) {
            completeTask(co.getId(), "IPA_UPLOAD", actor);
        }
        audit(employeeId, co.getId(), actor, "DOCUMENT_UPLOAD", null, null, docType.name() + " v" + version);
        return OnboardingDocumentDto.from(doc);
    }

    @Transactional
    public Resource downloadDocument(UUID employeeId, UUID documentId, boolean asEmployee, UUID actor) {
        OnboardingDocumentEntity doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Document not found"));
        if (!doc.getEmployeeId().equals(employeeId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Forbidden", "Document does not belong to this employee");
        }
        if (asEmployee) {
            String vis = doc.getVisibility() != null ? doc.getVisibility() : "HR_ADMIN";
            if (!vis.contains("EMPLOYEE")) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Forbidden", "Document not visible to employee");
            }
            doc.setViewedByEmployee(true);
            doc.setDownloadedByEmployee(true);
            documentRepository.save(doc);
        }
        audit(employeeId, doc.getOnboardingId(), actor, "DOCUMENT_DOWNLOAD", null, null, doc.getFileName());
        return new FileSystemResource(fileStorage.resolve(doc.getStoragePath()));
    }

    public String documentFileName(UUID documentId) {
        return documentRepository.findById(documentId)
                .map(OnboardingDocumentEntity::getFileName)
                .orElse("document.bin");
    }

    @Transactional
    public OnboardingDetailDto employeeConfirmArrival(UUID employeeId) {
        CandidateOnboardingEntity co = requireOnboarding(employeeId);
        ArrivalRecordEntity arrival = arrivalRepository.findByEmployeeId(employeeId).orElseGet(() -> {
            ArrivalRecordEntity n = new ArrivalRecordEntity();
            n.setEmployeeId(employeeId);
            n.setOnboardingId(co.getId());
            return n;
        });
        arrival.setEmployeeConfirmed(true);
        if (arrival.getActualArrivalDate() == null) {
            arrival.setActualArrivalDate(LocalDate.now());
        }
        arrivalRepository.save(arrival);
        EmployeeEntity employee = requireEmployee(employeeId);
        completeTask(co.getId(), "ARRIVAL", null);
        applyStatus(employee, co, PipelineStatus.ARRIVED_IN_SINGAPORE, null, "EMPLOYEE_ARRIVAL_CONFIRM", null);
        markOpenSecureLinksUsed(employeeId, OnboardingSecureLinkService.ACTION_ARRIVAL);
        return employeeSelfDetail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto employeeAckContract(UUID employeeId, String ip) {
        CandidateOnboardingEntity co = requireOnboarding(employeeId);
        EmployeeAcknowledgementEntity ack = ackRepository
                .findByOnboardingIdAndAckType(co.getId(), "CONTRACT")
                .orElseGet(() -> {
                    EmployeeAcknowledgementEntity n = new EmployeeAcknowledgementEntity();
                    n.setEmployeeId(employeeId);
                    n.setOnboardingId(co.getId());
                    n.setAckType("CONTRACT");
                    return n;
                });
        ack.setAcknowledged(true);
        ack.setAcknowledgedAt(Instant.now());
        ack.setIpAddress(ip);
        ackRepository.save(ack);
        completeTask(co.getId(), "CONTRACT_ACK", null);
        markOpenSecureLinksUsed(employeeId, OnboardingSecureLinkService.ACTION_CONTRACT);
        audit(employeeId, co.getId(), null, "CONTRACT_ACK", null, null, "Employee acknowledged contract");
        tryAutoReady(employeeId);
        return employeeSelfDetail(employeeId);
    }

    @Transactional
    public OnboardingDetailDto employeeConfirmPpe(UUID employeeId) {
        CandidateOnboardingEntity co = requireOnboarding(employeeId);
        if (co.getPpePhotoDocumentId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Photo Required",
                    "Upload a PPE confirmation photo before completing this step.");
        }
        return finalizeEmployeePpeConfirm(employeeId, co);
    }

    /**
     * Employee confirms PPE receipt by uploading a photo. Completes PPE_CONFIRM only after the photo is stored.
     */
    @Transactional
    public OnboardingDetailDto employeeConfirmPpeWithPhoto(UUID employeeId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "PPE confirmation photo is required");
        }
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase(Locale.ROOT) : "";
        if (!contentType.startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                    "Please upload an image file (camera photo or gallery image).");
        }
        CandidateOnboardingEntity co = requireOnboarding(employeeId);
        List<PpeIssuanceEntity> items = ppeRepository.findByOnboardingId(co.getId());
        if (items.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                    "No PPE items issued by HR yet — ask HR to record issuance first");
        }
        OnboardingDocumentDto doc = uploadDocument(
                employeeId, OnboardingDocType.PPE_RECEIPT_PHOTO, file, null, null,
                "HR_ADMIN_EMPLOYEE", null);
        co.setPpePhotoDocumentId(doc.id());
        co.setPpeHrVerifiedAt(null);
        co.setPpeHrVerifiedByUserId(null);
        onboardingRepository.save(co);
        // Reset HR verify task if re-uploading
        taskRepository.findByOnboardingIdAndTaskCode(co.getId(), "SG_PPE_PHOTO_VERIFIED").ifPresent(t -> {
            t.setStatus(OnboardingTaskStatus.PENDING);
            t.setCompletedAt(null);
            t.setCompletedByUserId(null);
            taskRepository.save(t);
        });
        return finalizeEmployeePpeConfirm(employeeId, co);
    }

    private OnboardingDetailDto finalizeEmployeePpeConfirm(UUID employeeId, CandidateOnboardingEntity co) {
        Instant now = Instant.now();
        for (PpeIssuanceEntity item : ppeRepository.findByOnboardingId(co.getId())) {
            item.setEmployeeConfirmed(true);
            item.setConfirmedAt(now);
            ppeRepository.save(item);
        }
        completeTask(co.getId(), "PPE_CONFIRM", null);
        markOpenSecureLinksUsed(employeeId, OnboardingSecureLinkService.ACTION_PPE);
        audit(employeeId, co.getId(), null, "PPE_CONFIRM", null, null,
                "Employee confirmed PPE with receipt photo");
        tryAutoReady(employeeId);
        return employeeSelfDetail(employeeId);
    }

    private void markOpenSecureLinksUsed(UUID employeeId, String actionType) {
        for (OnboardingSecureLinkEntity link : secureLinkRepository
                .findByEmployeeIdAndRevokedAtIsNullAndUsedAtIsNull(employeeId)) {
            if (actionType.equalsIgnoreCase(link.getActionType())) {
                secureLinkService.markUsed(link);
            }
        }
    }

    @Transactional
    public OnboardingDetailDto hrVerifyPpePhoto(UUID employeeId, UUID actor) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        if (co.getPpePhotoDocumentId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                    "Employee has not uploaded a PPE confirmation photo yet");
        }
        co.setPpeHrVerifiedAt(Instant.now());
        co.setPpeHrVerifiedByUserId(actor);
        onboardingRepository.save(co);
        completeTask(co.getId(), "SG_PPE_PHOTO_VERIFIED", actor);
        audit(employeeId, co.getId(), actor, "PPE_PHOTO_VERIFIED", null, null,
                "HR verified PPE receipt photo");
        if (sgFlowService.enabled()) {
            sgFlowService.ensureSgTasks(employee, co);
        }
        tryAutoReady(employeeId);
        return detail(employeeId);
    }

    @Transactional
    public void markAccountActivated(UUID employeeId) {
        onboardingRepository.findByEmployeeId(employeeId).ifPresent(co -> {
            // Always persist checklist completion first — do not let auto-ready failures leave it PENDING
            completeTask(co.getId(), "ACCOUNT_ACTIVATE", null);
            audit(employeeId, co.getId(), null, "ACCOUNT_ACTIVATED", null, null, "OTP verified + password set");
            try {
                tryAutoReady(employeeId);
            } catch (Exception ignored) {
                // Account activation itself succeeded; Ready-to-Work remains an HR / gate concern
            }
        });
    }

    /**
     * Heal stale checklist rows: if the linked login is already active, mark ACCOUNT_ACTIVATE done.
     * Covers cases where OTP+password completed before onboarding existed, or the activate hook failed.
     */
    private void syncAccountActivateFromLogin(UUID employeeId, CandidateOnboardingEntity co) {
        if (!accountActive(employeeId)) {
            return;
        }
        completeTask(co.getId(), "ACCOUNT_ACTIVATE", null);
    }

    private void tryAutoReady(UUID employeeId) {
        EmployeeEntity employee = employeeRepository.findById(employeeId).orElse(null);
        CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(employeeId).orElse(null);
        if (employee == null || co == null) {
            return;
        }
        if (co.getPipelineStatus() == PipelineStatus.READY_TO_WORK
                || co.getPipelineStatus() == PipelineStatus.CANCELLED) {
            return;
        }
        if (readinessBlockers(co, employeeId).isEmpty()) {
            applyStatus(employee, co, PipelineStatus.READY_TO_WORK, null, "AUTO_READY",
                    "All mandatory gates satisfied");
            completeTask(co.getId(), "READY_TO_WORK", null);
            mailNotifier.notifyReadyToWork(employee);
        }
    }

    private void maybeAutoProvisionOnReady(
            EmployeeEntity employee, CandidateOnboardingEntity co, UUID actor, boolean createLogin
    ) {
        if (co.getPipelineStatus() != PipelineStatus.READY_TO_WORK || !createLogin) {
            return;
        }
        AppUserEntity user = appUserRepository.findByEmployeeId(employee.getId()).orElse(null);
        if (user != null && user.isActive()) {
            return;
        }
        try {
            enrollmentService.provisionInvitation(employee.getId(), employee.getPersonalEmail(), actor);
            completeTask(co.getId(), "ACCOUNT_ACTIVATE", actor);
        } catch (ApiException ignored) {
            // leave invitation for HR retry
        }
    }

    private void applyStatus(
            EmployeeEntity employee,
            CandidateOnboardingEntity co,
            PipelineStatus next,
            UUID actor,
            String action,
            String details
    ) {
        PipelineStatus from = co.getPipelineStatus();
        co.setPipelineStatus(next);
        if (next == PipelineStatus.READY_TO_WORK && co.getReadyToWorkAt() == null) {
            co.setReadyToWorkAt(Instant.now());
        }
        int pct = progressFor(next, co.isForeignWorker());
        if (sgFlowService.enabled()) {
            pct = sgFlowService.gateSnapshot(employee, co).progressPercent();
        }
        co.setChecklistProgress(pct);
        onboardingRepository.save(co);

        employee.setPipelineStatus(next);
        employee.setOnboardingProgress(pct);
        employee.setOnboardingStage(mapLegacyStage(next));
        if (next == PipelineStatus.READY_TO_WORK
                && employee.getEmploymentStatus() == EmployeeEntity.EmploymentStatus.PENDING) {
            employee.setEmploymentStatus(EmployeeEntity.EmploymentStatus.PROBATION);
            if (employee.getProbationEnd() == null && employee.getDateOfJoining() != null) {
                employee.setProbationEnd(employee.getDateOfJoining().plusMonths(6));
            }
        }
        employeeRepository.save(employee);
        audit(employee.getId(), co.getId(), actor, action,
                from != null ? from.name() : null, next.name(), details);
    }

    /** Keep list/detail progress aligned with SG gate checklist % when the feature flag is on. */
    private void refreshChecklistProgress(EmployeeEntity employee, CandidateOnboardingEntity co) {
        if (!sgFlowService.enabled()) {
            return;
        }
        int pct = sgFlowService.gateSnapshot(employee, co).progressPercent();
        if (co.getChecklistProgress() == pct && employee.getOnboardingProgress() == pct) {
            return;
        }
        co.setChecklistProgress(pct);
        employee.setOnboardingProgress(pct);
        onboardingRepository.save(co);
        employeeRepository.save(employee);
    }

    private List<String> readinessBlockers(CandidateOnboardingEntity co, UUID employeeId) {
        List<String> blockers = new ArrayList<>();
        EmployeeEntity employee = employeeRepository.findById(employeeId).orElse(null);
        if (sgFlowService.enabled() && employee != null) {
            // Single shared list — same as header READY / progress %
            return sgFlowService.extraReadyBlockers(employee, co);
        } else if (co.isForeignWorker()) {
            WorkPassRecordEntity wp = workPassRecordRepository.findByEmployeeId(employeeId).orElse(null);
            if (wp == null || wp.getWpNumber() == null || wp.getWpNumber().isBlank()) {
                blockers.add("Work permit not issued");
            }
            if (!programmeDone(co.getMedicalStatus())) {
                blockers.add("Medical not completed/N-A");
            }
            if (!programmeDone(co.getSipStatus())) {
                blockers.add("SIP not completed/N-A");
            }
            if (!programmeDone(co.getOnboardProgrammeStatus())) {
                blockers.add("Onboard programme not completed/N-A");
            }
        }
        for (OnboardingTaskEntity task : taskRepository.findByOnboardingIdOrderBySortOrderAsc(co.getId())) {
            if (!task.isMandatory() || !task.isApplies()) {
                continue;
            }
            if (task.getStatus() == OnboardingTaskStatus.COMPLETED
                    || task.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE) {
                continue;
            }
            if ("READY_TO_WORK".equals(task.getTaskCode())) {
                continue;
            }
            // SG v2 tasks (+ legacy MEDICAL_SIP bundle) are covered by extraReadyBlockers
            if (sgFlowService.enabled() && task.getTaskCode() != null
                    && (task.getTaskCode().startsWith("SG_") || "MEDICAL_SIP".equals(task.getTaskCode()))) {
                continue;
            }
            if ("ACCOUNT_ACTIVATE".equals(task.getTaskCode()) && accountActive(employeeId)) {
                continue;
            }
            if ("CONTRACT_ACK".equals(task.getTaskCode()) && !co.isContractAckRequired()) {
                continue;
            }
            if ("PPE_CONFIRM".equals(task.getTaskCode()) && !co.isPpeRequired()) {
                continue;
            }
            if ("WP_ISSUANCE".equals(task.getTaskCode()) && sgFlowService.enabled()) {
                // covered by SG ready blockers (WP or valid TP)
                continue;
            }
            blockers.add(task.getTitle() + " pending");
        }
        if (co.isContractAckRequired()) {
            boolean ack = ackRepository.findByOnboardingIdAndAckType(co.getId(), "CONTRACT")
                    .map(EmployeeAcknowledgementEntity::isAcknowledged)
                    .orElse(false);
            if (!ack) {
                blockers.add("Contract acknowledgement pending");
            }
        }
        if (co.isPpeRequired()) {
            List<PpeIssuanceEntity> ppe = ppeRepository.findByOnboardingId(co.getId());
            boolean alreadyListed = blockers.stream().anyMatch(b -> b.toLowerCase(Locale.ROOT).contains("ppe"));
            boolean photoMissing = co.getPpePhotoDocumentId() == null;
            if (!alreadyListed && (ppe.isEmpty()
                    || ppe.stream().anyMatch(p -> !p.isEmployeeConfirmed())
                    || photoMissing)) {
                blockers.add("PPE issuance/confirmation pending");
            }
        }
        return OnboardingGateCalculator.dedupePreserveOrder(blockers);
    }

    private void completeTask(UUID onboardingId, String code, UUID actor) {
        taskRepository.findByOnboardingIdAndTaskCode(onboardingId, code).ifPresent(task -> {
            if (task.getStatus() == OnboardingTaskStatus.COMPLETED
                    || task.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE) {
                return;
            }
            task.setStatus(OnboardingTaskStatus.COMPLETED);
            task.setCompletedAt(Instant.now());
            task.setCompletedByUserId(actor);
            taskRepository.save(task);
        });
    }

    private void syncProgrammeFromAppointments(CandidateOnboardingEntity co) {
        List<OnboardingAppointmentEntity> appts =
                appointmentRepository.findByEmployeeIdOrderByScheduledAtDesc(co.getEmployeeId());
        for (OnboardingAppointmentEntity a : appts) {
            String type = a.getAppointmentType() != null ? a.getAppointmentType().toUpperCase(Locale.ROOT) : "";
            if (type.contains("MEDICAL") && a.getOutcome() != ProgrammeOutcome.PENDING) {
                co.setMedicalStatus(a.getOutcome());
            }
            if (type.contains("SIP") && a.getOutcome() != ProgrammeOutcome.PENDING) {
                co.setSipStatus(a.getOutcome());
            }
            if (type.contains("ONBOARD") && a.getOutcome() != ProgrammeOutcome.PENDING) {
                co.setOnboardProgrammeStatus(a.getOutcome());
            }
        }
    }

    private OnboardingDetailDto toDetail(EmployeeEntity e, CandidateOnboardingEntity co, boolean includeSensitive) {
        ArrivalRecordEntity arrival = arrivalRepository.findByEmployeeId(e.getId()).orElse(null);
        WorkPassRecordEntity wp = workPassRecordRepository.findByEmployeeId(e.getId()).orElse(null);
        List<OnboardingDocumentEntity> docs = documentRepository.findByEmployeeIdOrderByCreatedAtDesc(e.getId());
        if (!includeSensitive) {
            docs = docs.stream()
                    .filter(d -> d.getVisibility() != null && d.getVisibility().contains("EMPLOYEE"))
                    .toList();
        }
        // De-dupe PPE by itemCode for UI (keep earliest issuance)
        Map<String, PpeIssuanceEntity> ppeByCode = new java.util.LinkedHashMap<>();
        for (PpeIssuanceEntity p : ppeRepository.findByEmployeeIdOrderByCreatedAtAsc(e.getId())) {
            String key = p.getItemCode() != null ? p.getItemCode().trim().toUpperCase(Locale.ROOT) : p.getId().toString();
            ppeByCode.putIfAbsent(key, p);
        }
        List<OnboardingDetailDto.PpeDto> ppe = ppeByCode.values().stream()
                .map(p -> new OnboardingDetailDto.PpeDto(
                        p.getId(), p.getItemCode(), p.getItemName(), p.getQuantity(),
                        p.getIssuedAt(), p.isEmployeeConfirmed(), p.getConfirmedAt()))
                .toList();
        OnboardingDetailDto.PpePhotoDto ppePhoto = null;
        if (co.getPpePhotoDocumentId() != null) {
            OnboardingDocumentEntity photoDoc = documentRepository.findById(co.getPpePhotoDocumentId()).orElse(null);
            if (photoDoc != null) {
                ppePhoto = new OnboardingDetailDto.PpePhotoDto(
                        photoDoc.getId(),
                        photoDoc.getFileName(),
                        photoDoc.getContentType(),
                        photoDoc.getCreatedAt(),
                        co.getPpeHrVerifiedAt() != null,
                        co.getPpeHrVerifiedAt());
            }
        }
        List<OnboardingDetailDto.AckDto> acks = ackRepository.findByEmployeeId(e.getId()).stream()
                .map(a -> new OnboardingDetailDto.AckDto(a.getAckType(), a.isAcknowledged(), a.getAcknowledgedAt()))
                .toList();
        List<OnboardingDetailDto.AppointmentDto> appts =
                appointmentRepository.findByEmployeeIdOrderByScheduledAtDesc(e.getId()).stream()
                        .map(a -> new OnboardingDetailDto.AppointmentDto(
                                a.getId(), a.getAppointmentType(), a.getScheduledAt(),
                                a.getLocation(), a.getOutcome().name(), a.getNotes()))
                        .toList();
        List<OnboardingDetailDto.AuditDto> audits = includeSensitive
                ? auditRepository.findByEmployeeIdOrderByCreatedAtDesc(e.getId()).stream()
                .limit(40)
                .map(a -> new OnboardingDetailDto.AuditDto(
                        a.getCreatedAt(), a.getAction(), a.getFromStatus(), a.getToStatus(), a.getDetails()))
                .toList()
                : List.of();

        int progressPct = co.getChecklistProgress();
        if (sgFlowService.enabled()) {
            progressPct = sgFlowService.gateSnapshot(e, co).progressPercent();
        }

        return new OnboardingDetailDto(
                e.getId(),
                co.getId(),
                e.getEmployeeCode(),
                e.getFullName(),
                e.getPersonalEmail(),
                e.getMobile(),
                e.getDesignation(),
                e.getDepartment(),
                e.getWorkPassType(),
                co.isForeignWorker(),
                co.getWorkerCategory(),
                co.getSector(),
                co.getPipelineStatus().name(),
                mapLegacyStage(co.getPipelineStatus()).name(),
                progressPct,
                e.getEmploymentStatus() != null ? e.getEmploymentStatus().name() : null,
                e.getInvitationEmailStatus(),
                accountStatus(e.getId()),
                co.getMedicalStatus().name(),
                co.getSipStatus().name(),
                co.getOnboardProgrammeStatus().name(),
                co.getQuarantineStatus().name(),
                co.isContractAckRequired(),
                co.isPpeRequired(),
                co.isInductionRequired(),
                co.getReadyBlockedReason(),
                co.getOverrideReason(),
                co.getNotes(),
                arrival == null ? null : new OnboardingDetailDto.ArrivalDto(
                        arrival.getPlannedArrivalDate(),
                        arrival.getActualArrivalDate(),
                        arrival.getFlightNumber(),
                        arrival.getArrivalAirport(),
                        arrival.getAccommodationAddress(),
                        arrival.isHousingConfirmed(),
                        arrival.isBondArranged(),
                        arrival.isInsuranceArranged(),
                        arrival.isEmployeeConfirmed(),
                        arrival.getNotes(),
                        arrival.getAccommodationType(),
                        arrival.getDormCapacity(),
                        arrival.getMomAddressRegistered(),
                        arrival.getPcpRecorded(),
                        arrival.getMedicalInsuranceRecorded(),
                        arrival.getSecurityBondPurchased()),
                wp == null ? null : new OnboardingDetailDto.WorkPassDto(
                        wp.getIpaNumber(),
                        wp.getIpaIssueDate(),
                        wp.getIpaExpiryDate(),
                        wp.getWpNumber(),
                        wp.getWpIssueDate(),
                        wp.getWpExpiryDate(),
                        includeSensitive ? wp.getFinNumber() : OnboardingSgFlowService.maskId(wp.getFinNumber()),
                        wp.isCardCollected(),
                        wp.getNotes(),
                        wp.getIpaExtensionRequested(),
                        wp.getTpNumber(),
                        wp.getTpIssueDate(),
                        wp.getTpExpiryDate(),
                        wp.isTpValid()),
                taskRepository.findByOnboardingIdOrderBySortOrderAsc(co.getId()).stream()
                        .filter(t -> includeSensitive || t.isApplies())
                        .filter(t -> includeSensitive || t.getStatus() != OnboardingTaskStatus.NOT_APPLICABLE)
                        .map(OnboardingTaskDto::from)
                        .toList(),
                docs.stream().map(OnboardingDocumentDto::from).toList(),
                ppe,
                ppePhoto,
                acks,
                appts,
                audits,
                readinessBlockers(co, e.getId()),
                sgFlowService.buildDto(e, co, includeSensitive)
        );
    }

    private OnboardingCandidateDto toCandidateDto(EmployeeEntity e) {
        CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(e.getId()).orElse(null);
        String pipeline = co != null
                ? co.getPipelineStatus().name()
                : (e.getPipelineStatus() != null ? e.getPipelineStatus().name() : "DRAFT");
        int progress = co != null ? co.getChecklistProgress() : e.getOnboardingProgress();
        if (sgFlowService.enabled() && co != null) {
            progress = sgFlowService.gateSnapshot(e, co).progressPercent();
        }
        boolean completed = "READY_TO_WORK".equals(pipeline);
        Instant readyAt = co != null ? co.getReadyToWorkAt() : null;
        return new OnboardingCandidateDto(
                e.getId(),
                e.getEmployeeCode(),
                e.getFullName(),
                e.getDesignation(),
                e.getDepartment(),
                e.getDateOfJoining(),
                completed ? "Onboarding completed" : friendlyStatus(pipeline),
                e.getEmploymentType() != null ? e.getEmploymentType().name() : null,
                e.getWorkPassType(),
                progress,
                e.getPersonalEmail(),
                e.getMobile(),
                e.getEmploymentStatus() != null ? e.getEmploymentStatus().name() : null,
                e.getInvitationEmailStatus(),
                accountStatus(e.getId()),
                pipeline,
                co != null && co.isForeignWorker(),
                co != null ? co.getWorkerCategory() : e.getWorkerCategory(),
                readyAt,
                completed
        );
    }

    private void audit(
            UUID employeeId, UUID onboardingId, UUID actor, String action,
            String from, String to, String details
    ) {
        OnboardingAuditLogEntity log = new OnboardingAuditLogEntity();
        log.setEmployeeId(employeeId);
        log.setOnboardingId(onboardingId);
        log.setActorUserId(actor);
        log.setAction(action);
        log.setFromStatus(from);
        log.setToStatus(to);
        log.setDetails(details);
        auditRepository.save(log);
    }

    private EmployeeEntity requireEmployee(UUID id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
    }

    private CandidateOnboardingEntity requireOnboarding(UUID employeeId) {
        return onboardingRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Onboarding not found"));
    }

    private boolean accountActive(UUID employeeId) {
        return appUserRepository.findByEmployeeId(employeeId).map(AppUserEntity::isActive).orElse(false);
    }

    private boolean accountPending(UUID employeeId) {
        return appUserRepository.findByEmployeeId(employeeId)
                .map(u -> !u.isActive())
                .orElse(false);
    }

    private String accountStatus(UUID employeeId) {
        AppUserEntity user = appUserRepository.findByEmployeeId(employeeId).orElse(null);
        if (user != null && user.isActive()) {
            return "ACTIVE";
        }
        if (user != null) {
            return "INVITATION_PENDING";
        }
        return "NOT_PROVISIONED";
    }

    private static boolean programmeDone(ProgrammeOutcome o) {
        return OnboardingSgFlowService.programmeDone(o);
    }

    private static boolean isCompletingProgramme(String raw) {
        if (raw == null || raw.isBlank()) {
            return false;
        }
        String v = raw.trim().toUpperCase(Locale.ROOT);
        return "COMPLETED".equals(v) || "FIT".equals(v) || "UNFIT".equals(v);
    }

    @Transactional
    public OnboardingDetailDto markInductionDone(
            UUID employeeId, String trainerName, LocalDate inductionDate, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        if (trainerName == null || trainerName.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Trainer name is required");
        }
        LocalDate when = inductionDate != null ? inductionDate : LocalDate.now();
        completeTask(co.getId(), "INDUCTION", actor);
        audit(employeeId, co.getId(), actor, "INDUCTION_DONE", null, "COMPLETED",
                "trainer=" + trainerName.trim() + "; date=" + when);
        if (sgFlowService.enabled()) {
            sgFlowService.ensureSgTasks(employee, co);
        }
        return detail(employeeId);
    }

    private static void requireHrAdminForOverride() {
        try {
            WorkrightUserDetails user = SecurityUtils.currentUser();
            if (user.getUser().getRole() != UserRole.ADMIN) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Forbidden",
                        "Only HR_ADMIN (ADMIN role) may override the Ready-to-Work gate");
            }
        } catch (IllegalStateException ex) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Forbidden",
                    "Only HR_ADMIN (ADMIN role) may override the Ready-to-Work gate");
        }
    }

    @Transactional
    public OnboardingDetailDto recordTemporaryPermit(
            UUID employeeId, PipelineActionRequests.TemporaryPermitRequest request, UUID actor
    ) {
        EmployeeEntity employee = requireEmployee(employeeId);
        CandidateOnboardingEntity co = ensureOnboarding(employee, actor);
        if (sgFlowService.enabled()) {
            var ctx = sgFlowService.workerContext(employee, co);
            if (!OnboardingSgFlowRules.applies(
                    OnboardingSgFlowRules.SgStep.TEMPORARY_PERMIT, ctx)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                        "Temporary Permit step does not apply for this worker");
            }
            if (!OnboardingSgFlowRules.temporaryPermitAllowedToday(ctx, LocalDate.now())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                        "Temporary Permit for non-Malaysian workers is only allowed from the 2nd day after arrival");
            }
        }
        WorkPassRecordEntity wp = workPassRecordRepository.findByEmployeeId(employeeId).orElseGet(() -> {
            WorkPassRecordEntity n = new WorkPassRecordEntity();
            n.setEmployeeId(employeeId);
            n.setOnboardingId(co.getId());
            return n;
        });
        wp.setTpNumber(request.tpNumber());
        wp.setTpIssueDate(request.tpIssueDate());
        wp.setTpExpiryDate(request.tpExpiryDate());
        wp.setTpValid(request.tpValid());
        if (request.notes() != null) {
            wp.setNotes(request.notes());
        }
        workPassRecordRepository.save(wp);
        audit(employeeId, co.getId(), actor, "TP_RECORDED", null, null, request.tpNumber());
        if (sgFlowService.enabled()) {
            sgFlowService.ensureSgTasks(employee, co);
        }
        return detail(employeeId);
    }

    private static ProgrammeOutcome parseOutcome(String raw) {
        if (raw == null || raw.isBlank()) {
            return ProgrammeOutcome.PENDING;
        }
        try {
            return ProgrammeOutcome.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid programme outcome: " + raw);
        }
    }

    private static PipelineStatus parseStatus(String raw) {
        try {
            return PipelineStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid pipeline status: " + raw);
        }
    }

    private static String defaultVisibility(OnboardingDocType type) {
        return switch (type) {
            case EMPLOYMENT_CONTRACT, FLIGHT_ARRIVAL, ACCOMMODATION, PPE_SAFETY_TRAINING,
                    PPE_RECEIPT_PHOTO, WP_NOTIFICATION ->
                    "HR_ADMIN_EMPLOYEE";
            case PASSPORT, MEDICAL_CONFIRMATION, IPA_FULL_SET -> "HR_ADMIN";
            default -> "HR_ADMIN";
        };
    }

    private static int progressFor(PipelineStatus status, boolean foreign) {
        List<PipelineStatus> flow = foreign ? FOREIGN_FLOW : LOCAL_FLOW;
        int idx = flow.indexOf(status);
        if (idx < 0) {
            return status == PipelineStatus.READY_TO_WORK ? 100 : 5;
        }
        return Math.min(100, (int) Math.round(((idx + 1.0) / flow.size()) * 100));
    }

    /** True when current is at or past target on the foreign pipeline order (used to avoid re-notify / regress). */
    private static boolean isAtOrAfter(PipelineStatus current, PipelineStatus target) {
        if (current == null || target == null) {
            return false;
        }
        if (current == target) {
            return true;
        }
        int ci = FOREIGN_FLOW.indexOf(current);
        int ti = FOREIGN_FLOW.indexOf(target);
        if (ci < 0 || ti < 0) {
            return false;
        }
        return ci >= ti;
    }

    private static EmployeeEntity.OnboardingStage mapLegacyStage(PipelineStatus status) {
        return switch (status) {
            case DRAFT, DOCUMENTS_PENDING -> EmployeeEntity.OnboardingStage.OFFER;
            case APPLICATION_SUBMITTED, IPA_APPROVED, PRE_ARRIVAL_PENDING, READY_FOR_TRAVEL ->
                    EmployeeEntity.OnboardingStage.MOM_FORMS;
            case ARRIVED_IN_SINGAPORE, POST_ARRIVAL_PENDING -> EmployeeEntity.OnboardingStage.MEDICAL;
            case WORK_PERMIT_ISSUED, ONBOARDING_IN_PROGRESS, ON_HOLD -> EmployeeEntity.OnboardingStage.ORIENTATION;
            case READY_TO_WORK -> EmployeeEntity.OnboardingStage.COMPLETED;
            case CANCELLED -> EmployeeEntity.OnboardingStage.OFFER;
        };
    }

    private static String friendlyStatus(String pipeline) {
        if (pipeline == null) {
            return "Draft";
        }
        return switch (pipeline) {
            case "DRAFT" -> "Draft";
            case "DOCUMENTS_PENDING" -> "Documents Pending";
            case "APPLICATION_SUBMITTED" -> "Application Submitted";
            case "IPA_APPROVED" -> "IPA Approved";
            case "PRE_ARRIVAL_PENDING" -> "Pre-Arrival";
            case "READY_FOR_TRAVEL" -> "Ready for Travel";
            case "ARRIVED_IN_SINGAPORE" -> "Arrived";
            case "POST_ARRIVAL_PENDING" -> "Post-Arrival";
            case "WORK_PERMIT_ISSUED" -> "Work Permit Issued";
            case "ONBOARDING_IN_PROGRESS" -> "Onboarding In Progress";
            case "READY_TO_WORK" -> "Ready to Work";
            case "CANCELLED" -> "Cancelled";
            case "ON_HOLD" -> "On Hold";
            default -> pipeline;
        };
    }

    private static int countPipeline(List<OnboardingCandidateDto> rows, PipelineStatus... statuses) {
        EnumSet<PipelineStatus> set = EnumSet.noneOf(PipelineStatus.class);
        set.addAll(List.of(statuses));
        return (int) rows.stream()
                .filter(r -> r.pipelineStatus() != null && set.contains(PipelineStatus.valueOf(r.pipelineStatus())))
                .count();
    }

    /** Used by scheduled IPA expiry reminders. */
    @Transactional(readOnly = true)
    public List<WorkPassRecordEntity> findExpiringIpa(LocalDate until) {
        return workPassRecordRepository.findExpiringIpaWithoutWp(until);
    }

    public boolean documentExists(String storagePath) {
        try {
            return Files.exists(fileStorage.resolve(storagePath));
        } catch (Exception ex) {
            return false;
        }
    }
}
