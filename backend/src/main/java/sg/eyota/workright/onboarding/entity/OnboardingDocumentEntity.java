package sg.eyota.workright.onboarding.entity;

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
@Table(name = "onboarding_documents")
public class OnboardingDocumentEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "onboarding_id", nullable = false)
    private UUID onboardingId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "doc_type", nullable = false, columnDefinition = "onboarding_doc_type")
    private OnboardingDocType docType = OnboardingDocType.OTHER;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "approval_status", nullable = false)
    private String approvalStatus = "UPLOADED";

    @Column(name = "version_no", nullable = false)
    private int versionNo = 1;

    /** HR_ADMIN | HR_ADMIN_EMPLOYEE | EMPLOYEE */
    @Column(nullable = false)
    private String visibility = "HR_ADMIN";

    @Column(name = "uploaded_by_user_id")
    private UUID uploadedByUserId;

    @Column(name = "viewed_by_employee", nullable = false)
    private boolean viewedByEmployee;

    @Column(name = "downloaded_by_employee", nullable = false)
    private boolean downloadedByEmployee;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public UUID getOnboardingId() { return onboardingId; }
    public void setOnboardingId(UUID onboardingId) { this.onboardingId = onboardingId; }
    public OnboardingDocType getDocType() { return docType; }
    public void setDocType(OnboardingDocType docType) { this.docType = docType; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
    public Long getSizeBytes() { return sizeBytes; }
    public void setSizeBytes(Long sizeBytes) { this.sizeBytes = sizeBytes; }
    public LocalDate getIssueDate() { return issueDate; }
    public void setIssueDate(LocalDate issueDate) { this.issueDate = issueDate; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
    public int getVersionNo() { return versionNo; }
    public void setVersionNo(int versionNo) { this.versionNo = versionNo; }
    public String getVisibility() { return visibility; }
    public void setVisibility(String visibility) { this.visibility = visibility; }
    public UUID getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(UUID uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }
    public boolean isViewedByEmployee() { return viewedByEmployee; }
    public void setViewedByEmployee(boolean viewedByEmployee) { this.viewedByEmployee = viewedByEmployee; }
    public boolean isDownloadedByEmployee() { return downloadedByEmployee; }
    public void setDownloadedByEmployee(boolean downloadedByEmployee) {
        this.downloadedByEmployee = downloadedByEmployee;
    }
}
