package sg.eyota.workright.onboarding.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import sg.eyota.workright.common.persistence.AuditedEntity;

@Entity
@Table(name = "candidate_onboarding")
public class CandidateOnboardingEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, unique = true)
    private UUID employeeId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "pipeline_status", nullable = false, columnDefinition = "work_pass_pipeline_status")
    private PipelineStatus pipelineStatus = PipelineStatus.DRAFT;

    @Column(name = "pass_type")
    private String passType;

    @Column(name = "worker_category")
    private String workerCategory;

    private String sector;

    @Column(name = "is_foreign_worker", nullable = false)
    private boolean foreignWorker;

    @Column(name = "checklist_progress", nullable = false)
    private int checklistProgress;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "medical_status", nullable = false, columnDefinition = "programme_outcome")
    private ProgrammeOutcome medicalStatus = ProgrammeOutcome.PENDING;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "sip_status", nullable = false, columnDefinition = "programme_outcome")
    private ProgrammeOutcome sipStatus = ProgrammeOutcome.PENDING;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "onboard_programme_status", nullable = false, columnDefinition = "programme_outcome")
    private ProgrammeOutcome onboardProgrammeStatus = ProgrammeOutcome.PENDING;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "quarantine_status", nullable = false, columnDefinition = "programme_outcome")
    private ProgrammeOutcome quarantineStatus = ProgrammeOutcome.NOT_APPLICABLE;

    @Column(name = "contract_ack_required", nullable = false)
    private boolean contractAckRequired = true;

    @Column(name = "ppe_required", nullable = false)
    private boolean ppeRequired = true;

    @Column(name = "induction_required", nullable = false)
    private boolean inductionRequired = true;

    @Column(name = "ready_blocked_reason")
    private String readyBlockedReason;

    @Column(name = "override_reason")
    private String overrideReason;

    private String notes;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "construction_safety_status", nullable = false, columnDefinition = "programme_outcome")
    /** PENDING until HR saves the programmes form — must not default to N/A (N/A counts as done). */
    private ProgrammeOutcome constructionSafetyStatus = ProgrammeOutcome.PENDING;

    @Column(name = "sg_flow_v2_tasks_seeded", nullable = false)
    private boolean sgFlowV2TasksSeeded;

    /** Document id of employee PPE receipt photo (OnboardingDocType.PPE_RECEIPT_PHOTO). */
    @Column(name = "ppe_photo_document_id")
    private UUID ppePhotoDocumentId;

    @Column(name = "ppe_hr_verified_at")
    private Instant ppeHrVerifiedAt;

    @Column(name = "ppe_hr_verified_by_user_id")
    private UUID ppeHrVerifiedByUserId;

    /** When pipeline first reached READY_TO_WORK — used to keep candidate visible for 7 days. */
    @Column(name = "ready_to_work_at")
    private Instant readyToWorkAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public PipelineStatus getPipelineStatus() { return pipelineStatus; }
    public void setPipelineStatus(PipelineStatus pipelineStatus) { this.pipelineStatus = pipelineStatus; }
    public String getPassType() { return passType; }
    public void setPassType(String passType) { this.passType = passType; }
    public String getWorkerCategory() { return workerCategory; }
    public void setWorkerCategory(String workerCategory) { this.workerCategory = workerCategory; }
    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }
    public boolean isForeignWorker() { return foreignWorker; }
    public void setForeignWorker(boolean foreignWorker) { this.foreignWorker = foreignWorker; }
    public int getChecklistProgress() { return checklistProgress; }
    public void setChecklistProgress(int checklistProgress) { this.checklistProgress = checklistProgress; }
    public ProgrammeOutcome getMedicalStatus() { return medicalStatus; }
    public void setMedicalStatus(ProgrammeOutcome medicalStatus) { this.medicalStatus = medicalStatus; }
    public ProgrammeOutcome getSipStatus() { return sipStatus; }
    public void setSipStatus(ProgrammeOutcome sipStatus) { this.sipStatus = sipStatus; }
    public ProgrammeOutcome getOnboardProgrammeStatus() { return onboardProgrammeStatus; }
    public void setOnboardProgrammeStatus(ProgrammeOutcome onboardProgrammeStatus) {
        this.onboardProgrammeStatus = onboardProgrammeStatus;
    }
    public ProgrammeOutcome getQuarantineStatus() { return quarantineStatus; }
    public void setQuarantineStatus(ProgrammeOutcome quarantineStatus) { this.quarantineStatus = quarantineStatus; }
    public boolean isContractAckRequired() { return contractAckRequired; }
    public void setContractAckRequired(boolean contractAckRequired) { this.contractAckRequired = contractAckRequired; }
    public boolean isPpeRequired() { return ppeRequired; }
    public void setPpeRequired(boolean ppeRequired) { this.ppeRequired = ppeRequired; }
    public boolean isInductionRequired() { return inductionRequired; }
    public void setInductionRequired(boolean inductionRequired) { this.inductionRequired = inductionRequired; }
    public String getReadyBlockedReason() { return readyBlockedReason; }
    public void setReadyBlockedReason(String readyBlockedReason) { this.readyBlockedReason = readyBlockedReason; }
    public String getOverrideReason() { return overrideReason; }
    public void setOverrideReason(String overrideReason) { this.overrideReason = overrideReason; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public UUID getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(UUID createdByUserId) { this.createdByUserId = createdByUserId; }
    public ProgrammeOutcome getConstructionSafetyStatus() { return constructionSafetyStatus; }
    public void setConstructionSafetyStatus(ProgrammeOutcome constructionSafetyStatus) {
        this.constructionSafetyStatus = constructionSafetyStatus;
    }
    public boolean isSgFlowV2TasksSeeded() { return sgFlowV2TasksSeeded; }
    public void setSgFlowV2TasksSeeded(boolean sgFlowV2TasksSeeded) {
        this.sgFlowV2TasksSeeded = sgFlowV2TasksSeeded;
    }
    public UUID getPpePhotoDocumentId() { return ppePhotoDocumentId; }
    public void setPpePhotoDocumentId(UUID ppePhotoDocumentId) { this.ppePhotoDocumentId = ppePhotoDocumentId; }
    public java.time.Instant getPpeHrVerifiedAt() { return ppeHrVerifiedAt; }
    public void setPpeHrVerifiedAt(java.time.Instant ppeHrVerifiedAt) { this.ppeHrVerifiedAt = ppeHrVerifiedAt; }
    public UUID getPpeHrVerifiedByUserId() { return ppeHrVerifiedByUserId; }
    public void setPpeHrVerifiedByUserId(UUID ppeHrVerifiedByUserId) {
        this.ppeHrVerifiedByUserId = ppeHrVerifiedByUserId;
    }
    public Instant getReadyToWorkAt() { return readyToWorkAt; }
    public void setReadyToWorkAt(Instant readyToWorkAt) { this.readyToWorkAt = readyToWorkAt; }
}
