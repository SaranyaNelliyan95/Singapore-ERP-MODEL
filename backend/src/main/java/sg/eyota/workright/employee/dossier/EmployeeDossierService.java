package sg.eyota.workright.employee.dossier;

import java.io.IOException;
import java.nio.file.Files;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.audit.AuditService;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.onboarding.entity.ArrivalRecordEntity;
import sg.eyota.workright.onboarding.entity.CandidateOnboardingEntity;
import sg.eyota.workright.onboarding.entity.OnboardingAuditLogEntity;
import sg.eyota.workright.onboarding.entity.OnboardingDocumentEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskStatus;
import sg.eyota.workright.onboarding.entity.PipelineStatus;
import sg.eyota.workright.onboarding.entity.PpeIssuanceEntity;
import sg.eyota.workright.onboarding.entity.WorkPassApplicationEntity;
import sg.eyota.workright.onboarding.entity.WorkPassRecordEntity;
import sg.eyota.workright.onboarding.repository.ArrivalRecordRepository;
import sg.eyota.workright.onboarding.repository.CandidateOnboardingRepository;
import sg.eyota.workright.onboarding.repository.OnboardingAuditLogRepository;
import sg.eyota.workright.onboarding.repository.OnboardingDocumentRepository;
import sg.eyota.workright.onboarding.repository.OnboardingTaskRepository;
import sg.eyota.workright.onboarding.repository.PpeIssuanceRepository;
import sg.eyota.workright.onboarding.repository.WorkPassApplicationRepository;
import sg.eyota.workright.onboarding.repository.WorkPassRecordRepository;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowService;
import sg.eyota.workright.onboarding.storage.OnboardingFileStorage;
import sg.eyota.workright.security.WorkrightUserDetails;

@Service
public class EmployeeDossierService {

    private static final Logger log = LoggerFactory.getLogger(EmployeeDossierService.class);
    private static final ZoneId SG = ZoneId.of("Asia/Singapore");
    private static final DateTimeFormatter FILE_TS =
            DateTimeFormatter.ofPattern("yyyyMMdd-HHmm").withZone(SG);

    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final CandidateOnboardingRepository onboardingRepository;
    private final OnboardingTaskRepository taskRepository;
    private final OnboardingDocumentRepository documentRepository;
    private final OnboardingAuditLogRepository auditLogRepository;
    private final ArrivalRecordRepository arrivalRepository;
    private final WorkPassRecordRepository workPassRecordRepository;
    private final WorkPassApplicationRepository workPassApplicationRepository;
    private final PpeIssuanceRepository ppeRepository;
    private final OnboardingFileStorage fileStorage;
    private final OnboardingSgFlowService sgFlowService;
    private final AuditService auditService;
    private final EmployeeDossierPdfRenderer pdfRenderer;

    public EmployeeDossierService(
            EmployeeRepository employeeRepository,
            AppUserRepository appUserRepository,
            CandidateOnboardingRepository onboardingRepository,
            OnboardingTaskRepository taskRepository,
            OnboardingDocumentRepository documentRepository,
            OnboardingAuditLogRepository auditLogRepository,
            ArrivalRecordRepository arrivalRepository,
            WorkPassRecordRepository workPassRecordRepository,
            WorkPassApplicationRepository workPassApplicationRepository,
            PpeIssuanceRepository ppeRepository,
            OnboardingFileStorage fileStorage,
            OnboardingSgFlowService sgFlowService,
            AuditService auditService,
            EmployeeDossierPdfRenderer pdfRenderer
    ) {
        this.employeeRepository = employeeRepository;
        this.appUserRepository = appUserRepository;
        this.onboardingRepository = onboardingRepository;
        this.taskRepository = taskRepository;
        this.documentRepository = documentRepository;
        this.auditLogRepository = auditLogRepository;
        this.arrivalRepository = arrivalRepository;
        this.workPassRecordRepository = workPassRecordRepository;
        this.workPassApplicationRepository = workPassApplicationRepository;
        this.ppeRepository = ppeRepository;
        this.fileStorage = fileStorage;
        this.sgFlowService = sgFlowService;
        this.auditService = auditService;
        this.pdfRenderer = pdfRenderer;
    }

    @Transactional(readOnly = true)
    public EmployeeDossierResult export(
            UUID employeeId,
            EmployeeDossierExportMode mode,
            WorkrightUserDetails actor
    ) {
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));

        CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(employeeId).orElse(null);
        ArrivalRecordEntity arrival = arrivalRepository.findByEmployeeId(employeeId).orElse(null);
        WorkPassRecordEntity wp = workPassRecordRepository.findByEmployeeId(employeeId).orElse(null);
        List<WorkPassApplicationEntity> apps =
                workPassApplicationRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
        List<OnboardingTaskEntity> tasks = co != null
                ? taskRepository.findByOnboardingIdOrderBySortOrderAsc(co.getId())
                : List.of();
        List<OnboardingDocumentEntity> docs = documentRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
        List<OnboardingAuditLogEntity> audits =
                auditLogRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
        List<PpeIssuanceEntity> ppe = ppeRepository.findByEmployeeIdOrderByCreatedAtAsc(employeeId);
        AppUserEntity account = appUserRepository.findByEmployeeId(employeeId).orElse(null);

        String managerName = null;
        if (employee.getManagerEmployeeId() != null) {
            managerName = employeeRepository.findById(employee.getManagerEmployeeId())
                    .map(EmployeeEntity::getFullName)
                    .orElse(null);
        }

        Map<UUID, String> userLabels = resolveUserLabels(audits, tasks, docs);

        boolean readyToWork = co != null && co.getPipelineStatus() == PipelineStatus.READY_TO_WORK;
        boolean sgReady = false;
        List<String> readyBlockers = List.of();
        if (sgFlowService.enabled() && co != null) {
            var snap = sgFlowService.gateSnapshot(employee, co);
            sgReady = snap.ready();
            readyBlockers = snap.stillRequired();
        }

        TaskStats stats = computeTaskStats(tasks);

        List<EmployeeDossierPdfRenderer.AttachmentBytes> imageAttachments = new ArrayList<>();
        List<EmployeeDossierPdfRenderer.AttachmentBytes> pdfAttachments = new ArrayList<>();
        for (OnboardingDocumentEntity doc : docs) {
            try {
                var path = fileStorage.resolve(doc.getStoragePath());
                if (!Files.exists(path)) {
                    continue;
                }
                byte[] bytes = Files.readAllBytes(path);
                String ct = doc.getContentType() != null ? doc.getContentType().toLowerCase(Locale.ROOT) : "";
                String name = doc.getFileName() != null ? doc.getFileName() : doc.getDocType().name();
                var att = new EmployeeDossierPdfRenderer.AttachmentBytes(
                        doc.getId(), name, doc.getDocType().name(), ct, bytes);
                if (ct.startsWith("image/") || name.toLowerCase(Locale.ROOT).matches(".*\\.(png|jpe?g|gif|webp)$")) {
                    imageAttachments.add(att);
                } else if (ct.contains("pdf") || name.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
                    pdfAttachments.add(att);
                }
            } catch (Exception ex) {
                log.debug("Skip attachment {} for dossier: {}", doc.getId(), ex.toString());
            }
        }

        String reportRef = "EYOTA-DOSSIER-" + employee.getEmployeeCode() + "-"
                + FILE_TS.format(Instant.now());

        EmployeeDossierPdfRenderer.DossierModel model = new EmployeeDossierPdfRenderer.DossierModel(
                mode,
                reportRef,
                Instant.now(),
                employee,
                account,
                managerName,
                co,
                arrival,
                wp,
                apps,
                tasks,
                docs,
                audits,
                ppe,
                stats,
                readyToWork,
                sgReady,
                readyBlockers,
                userLabels,
                imageAttachments,
                pdfAttachments
        );

        try {
            byte[] pdf = pdfRenderer.render(model);
            String modeTag = mode == EmployeeDossierExportMode.COMPLETE ? "COMPLETE" : "COPY";
            String fileName = "EYOTA_" + safe(employee.getEmployeeCode()) + "_Master_Dossier_"
                    + modeTag + "_" + FILE_TS.format(Instant.now()) + ".pdf";

            auditService.record(
                    actor.getUserId(),
                    "EMPLOYEE_DOSSIER_EXPORT",
                    "EMPLOYEE",
                    employeeId,
                    mode.name() + " · ref=" + reportRef
            );

            return new EmployeeDossierResult(pdf, fileName, reportRef);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Export failed",
                    "Unable to generate employee dossier PDF.");
        }
    }

    private Map<UUID, String> resolveUserLabels(
            List<OnboardingAuditLogEntity> audits,
            List<OnboardingTaskEntity> tasks,
            List<OnboardingDocumentEntity> docs
    ) {
        Map<UUID, String> labels = new HashMap<>();
        for (OnboardingAuditLogEntity a : audits) {
            if (a.getActorUserId() != null) {
                labels.putIfAbsent(a.getActorUserId(), null);
            }
        }
        for (OnboardingTaskEntity t : tasks) {
            if (t.getCompletedByUserId() != null) {
                labels.putIfAbsent(t.getCompletedByUserId(), null);
            }
        }
        for (OnboardingDocumentEntity d : docs) {
            if (d.getUploadedByUserId() != null) {
                labels.putIfAbsent(d.getUploadedByUserId(), null);
            }
        }
        for (UUID id : new ArrayList<>(labels.keySet())) {
            appUserRepository.findById(id).ifPresent(u -> labels.put(id, u.getEmail()));
        }
        return labels;
    }

    static TaskStats computeTaskStats(List<OnboardingTaskEntity> tasks) {
        int applicable = 0;
        int completed = 0;
        int pending = 0;
        int inProgress = 0;
        int notApplicable = 0;
        int rejected = 0;
        for (OnboardingTaskEntity t : tasks) {
            if (!t.isApplies() || t.getStatus() == OnboardingTaskStatus.NOT_APPLICABLE) {
                notApplicable++;
                continue;
            }
            applicable++;
            switch (t.getStatus()) {
                case COMPLETED -> completed++;
                case IN_PROGRESS -> inProgress++;
                case BLOCKED -> rejected++;
                default -> pending++;
            }
        }
        int pct = applicable == 0 ? 0 : (int) Math.round(completed * 100.0 / applicable);
        return new TaskStats(applicable, completed, pending, inProgress, notApplicable, rejected, pct);
    }

    private static String safe(String code) {
        return code == null ? "EMP" : code.replaceAll("[^A-Za-z0-9_-]", "_");
    }

    public record TaskStats(
            int applicable,
            int completed,
            int pending,
            int inProgress,
            int notApplicable,
            int rejected,
            int completionPercent
    ) {}

    public static String expiryStatus(LocalDate expiry, LocalDate today) {
        if (expiry == null) {
            return "MISSING";
        }
        if (expiry.isBefore(today)) {
            return "EXPIRED";
        }
        if (!expiry.isAfter(today.plusDays(90))) {
            return "EXPIRING_SOON";
        }
        return "VALID";
    }
}
