package sg.eyota.workright.employee.entity;

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
@Table(name = "employees")
public class EmployeeEntity extends AuditedEntity {

    public enum EmploymentType { FULL_TIME, PART_TIME, CONTRACT, INTERN }
    public enum EmploymentStatus { ACTIVE, PROBATION, NOTICE, TERMINATED, RESIGNED }
    public enum WorkLocationMode { OFFICE, HYBRID, REMOTE, SITE }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_code", nullable = false, unique = true)
    private String employeeCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "nric_fin_encrypted")
    private String nricFinEncrypted;

    private String department;
    private String designation;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "employment_type", columnDefinition = "employment_type")
    private EmploymentType employmentType = EmploymentType.FULL_TIME;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "employment_status", columnDefinition = "employment_status")
    private EmploymentStatus employmentStatus = EmploymentStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "work_location_mode", columnDefinition = "work_location_mode")
    private WorkLocationMode workLocationMode = WorkLocationMode.OFFICE;

    @Column(name = "workplace_id")
    private UUID workplaceId;

    @Column(name = "manager_employee_id")
    private UUID managerEmployeeId;

    @Column(name = "date_of_joining")
    private LocalDate dateOfJoining;

    @Column(name = "probation_end")
    private LocalDate probationEnd;

    @Column(name = "notice_end")
    private LocalDate noticeEnd;

    private String mobile;

    @Column(name = "personal_email")
    private String personalEmail;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "bank_account_masked")
    private String bankAccountMasked;

    @Column(nullable = false)
    private boolean active = true;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getNricFinEncrypted() {
        return nricFinEncrypted;
    }

    public void setNricFinEncrypted(String nricFinEncrypted) {
        this.nricFinEncrypted = nricFinEncrypted;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public EmploymentType getEmploymentType() {
        return employmentType;
    }

    public void setEmploymentType(EmploymentType employmentType) {
        this.employmentType = employmentType;
    }

    public EmploymentStatus getEmploymentStatus() {
        return employmentStatus;
    }

    public void setEmploymentStatus(EmploymentStatus employmentStatus) {
        this.employmentStatus = employmentStatus;
    }

    public WorkLocationMode getWorkLocationMode() {
        return workLocationMode;
    }

    public void setWorkLocationMode(WorkLocationMode workLocationMode) {
        this.workLocationMode = workLocationMode;
    }

    public UUID getWorkplaceId() {
        return workplaceId;
    }

    public void setWorkplaceId(UUID workplaceId) {
        this.workplaceId = workplaceId;
    }

    public UUID getManagerEmployeeId() {
        return managerEmployeeId;
    }

    public void setManagerEmployeeId(UUID managerEmployeeId) {
        this.managerEmployeeId = managerEmployeeId;
    }

    public LocalDate getDateOfJoining() {
        return dateOfJoining;
    }

    public void setDateOfJoining(LocalDate dateOfJoining) {
        this.dateOfJoining = dateOfJoining;
    }

    public LocalDate getProbationEnd() {
        return probationEnd;
    }

    public void setProbationEnd(LocalDate probationEnd) {
        this.probationEnd = probationEnd;
    }

    public LocalDate getNoticeEnd() {
        return noticeEnd;
    }

    public void setNoticeEnd(LocalDate noticeEnd) {
        this.noticeEnd = noticeEnd;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getPersonalEmail() {
        return personalEmail;
    }

    public void setPersonalEmail(String personalEmail) {
        this.personalEmail = personalEmail;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getBankAccountMasked() {
        return bankAccountMasked;
    }

    public void setBankAccountMasked(String bankAccountMasked) {
        this.bankAccountMasked = bankAccountMasked;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
