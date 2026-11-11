package sg.eyota.workright.onboarding.entity;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import sg.eyota.workright.common.persistence.AuditedEntity;

@Entity
@Table(name = "work_pass_applications")
public class WorkPassApplicationEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "onboarding_id", nullable = false)
    private UUID onboardingId;

    @Column(name = "mom_reference")
    private String momReference;

    @Column(name = "application_type")
    private String applicationType;

    @Column(name = "submitted_at")
    private LocalDate submittedAt;

    @Column(name = "submitted_by_user_id")
    private UUID submittedByUserId;

    @Column(name = "portal_notes")
    private String portalNotes;

    @Column(nullable = false)
    private String status = "SUBMITTED";

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public UUID getOnboardingId() { return onboardingId; }
    public void setOnboardingId(UUID onboardingId) { this.onboardingId = onboardingId; }
    public String getMomReference() { return momReference; }
    public void setMomReference(String momReference) { this.momReference = momReference; }
    public String getApplicationType() { return applicationType; }
    public void setApplicationType(String applicationType) { this.applicationType = applicationType; }
    public LocalDate getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDate submittedAt) { this.submittedAt = submittedAt; }
    public UUID getSubmittedByUserId() { return submittedByUserId; }
    public void setSubmittedByUserId(UUID submittedByUserId) { this.submittedByUserId = submittedByUserId; }
    public String getPortalNotes() { return portalNotes; }
    public void setPortalNotes(String portalNotes) { this.portalNotes = portalNotes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
