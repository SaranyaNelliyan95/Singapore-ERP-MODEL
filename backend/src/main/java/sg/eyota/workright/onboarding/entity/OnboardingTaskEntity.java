package sg.eyota.workright.onboarding.entity;

import java.time.Instant;
import java.time.LocalDate;
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
@Table(name = "onboarding_tasks")
public class OnboardingTaskEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "onboarding_id", nullable = false)
    private UUID onboardingId;

    @Column(name = "task_code", nullable = false)
    private String taskCode;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "stage_gate", columnDefinition = "work_pass_pipeline_status")
    private PipelineStatus stageGate;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "onboarding_task_status")
    private OnboardingTaskStatus status = OnboardingTaskStatus.PENDING;

    @Column(nullable = false)
    private boolean mandatory = true;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "completed_by_user_id")
    private UUID completedByUserId;

    private String notes;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** When false, UI should hide the step (SG-flow v2 applicability). */
    @Column(name = "applies", nullable = false)
    private boolean applies = true;

    @Column(name = "warning_text")
    private String warningText;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public UUID getOnboardingId() { return onboardingId; }
    public void setOnboardingId(UUID onboardingId) { this.onboardingId = onboardingId; }
    public String getTaskCode() { return taskCode; }
    public void setTaskCode(String taskCode) { this.taskCode = taskCode; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public PipelineStatus getStageGate() { return stageGate; }
    public void setStageGate(PipelineStatus stageGate) { this.stageGate = stageGate; }
    public OnboardingTaskStatus getStatus() { return status; }
    public void setStatus(OnboardingTaskStatus status) { this.status = status; }
    public boolean isMandatory() { return mandatory; }
    public void setMandatory(boolean mandatory) { this.mandatory = mandatory; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public UUID getCompletedByUserId() { return completedByUserId; }
    public void setCompletedByUserId(UUID completedByUserId) { this.completedByUserId = completedByUserId; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isApplies() { return applies; }
    public void setApplies(boolean applies) { this.applies = applies; }
    public String getWarningText() { return warningText; }
    public void setWarningText(String warningText) { this.warningText = warningText; }
}
