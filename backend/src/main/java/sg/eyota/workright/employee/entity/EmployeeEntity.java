package sg.eyota.workright.employee.entity;

import java.math.BigDecimal;
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

    public enum EmploymentType { FULL_TIME, PART_TIME, CONTRACT, INTERN, TEMPORARY }
    public enum EmploymentStatus { PENDING, ACTIVE, PROBATION, NOTICE, TERMINATED, RESIGNED, ON_LEAVE }
    public enum WorkLocationMode { OFFICE, HYBRID, REMOTE, SITE }
    public enum PaymentMode { BANKING, IN_HAND }
    public enum SalaryPeriod { HOURLY, DAILY, WEEKLY, FORTNIGHTLY, MONTHLY }
    public enum OnboardingStage { OFFER, MOM_FORMS, MEDICAL, ORIENTATION, COMPLETED }

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
    private EmploymentStatus employmentStatus = EmploymentStatus.PENDING;

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

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    private String gender;
    private String nationality;

    @Column(name = "residential_address")
    private String residentialAddress;

    @Column(name = "alternative_contact")
    private String alternativeContact;

    @Column(name = "work_pass_type")
    private String workPassType;

    @Column(name = "work_pass_number")
    private String workPassNumber;

    @Column(name = "work_pass_expiry")
    private LocalDate workPassExpiry;

    @Column(name = "fin_number")
    private String finNumber;

    @Column(name = "passport_number")
    private String passportNumber;

    @Column(name = "passport_expiry")
    private LocalDate passportExpiry;

    @Column(name = "payment_mode")
    private String paymentMode;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "bank_account_masked")
    private String bankAccountMasked;

    @Column(name = "bank_account_number_masked")
    private String bankAccountNumberMasked;

    @Column(name = "basic_pay", precision = 14, scale = 2)
    private BigDecimal basicPay;

    @Column(name = "overtime_rate", precision = 14, scale = 2)
    private BigDecimal overtimeRate;

    @Column(name = "salary_period")
    private String salaryPeriod;

    @Column(name = "allowances_total", precision = 14, scale = 2)
    private BigDecimal allowancesTotal = BigDecimal.ZERO;

    @Column(name = "payroll_start_date")
    private LocalDate payrollStartDate;

    @Column(nullable = false, length = 3)
    private String currency = "SGD";

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Column(name = "invitation_email_status")
    private String invitationEmailStatus = "NOT_SENT";

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "onboarding_stage", columnDefinition = "onboarding_stage")
    private OnboardingStage onboardingStage = OnboardingStage.OFFER;

    @Column(name = "onboarding_progress", nullable = false)
    private int onboardingProgress = 10;

    /** MOM-aligned foreign / work-pass pipeline (synced with candidate_onboarding). */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "pipeline_status", columnDefinition = "work_pass_pipeline_status")
    private sg.eyota.workright.onboarding.entity.PipelineStatus pipelineStatus =
            sg.eyota.workright.onboarding.entity.PipelineStatus.DRAFT;

    @Column(name = "worker_category")
    private String workerCategory;

    @Column(name = "nationality_code")
    private String nationalityCode;

    private String sector;

    @Column(nullable = false)
    private boolean active = true;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getNricFinEncrypted() { return nricFinEncrypted; }
    public void setNricFinEncrypted(String nricFinEncrypted) { this.nricFinEncrypted = nricFinEncrypted; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    public EmploymentType getEmploymentType() { return employmentType; }
    public void setEmploymentType(EmploymentType employmentType) { this.employmentType = employmentType; }
    public EmploymentStatus getEmploymentStatus() { return employmentStatus; }
    public void setEmploymentStatus(EmploymentStatus employmentStatus) { this.employmentStatus = employmentStatus; }
    public WorkLocationMode getWorkLocationMode() { return workLocationMode; }
    public void setWorkLocationMode(WorkLocationMode workLocationMode) { this.workLocationMode = workLocationMode; }
    public UUID getWorkplaceId() { return workplaceId; }
    public void setWorkplaceId(UUID workplaceId) { this.workplaceId = workplaceId; }
    public UUID getManagerEmployeeId() { return managerEmployeeId; }
    public void setManagerEmployeeId(UUID managerEmployeeId) { this.managerEmployeeId = managerEmployeeId; }
    public LocalDate getDateOfJoining() { return dateOfJoining; }
    public void setDateOfJoining(LocalDate dateOfJoining) { this.dateOfJoining = dateOfJoining; }
    public LocalDate getProbationEnd() { return probationEnd; }
    public void setProbationEnd(LocalDate probationEnd) { this.probationEnd = probationEnd; }
    public LocalDate getNoticeEnd() { return noticeEnd; }
    public void setNoticeEnd(LocalDate noticeEnd) { this.noticeEnd = noticeEnd; }
    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }
    public String getPersonalEmail() { return personalEmail; }
    public void setPersonalEmail(String personalEmail) { this.personalEmail = personalEmail; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getNationality() { return nationality; }
    public void setNationality(String nationality) { this.nationality = nationality; }
    public String getResidentialAddress() { return residentialAddress; }
    public void setResidentialAddress(String residentialAddress) { this.residentialAddress = residentialAddress; }
    public String getAlternativeContact() { return alternativeContact; }
    public void setAlternativeContact(String alternativeContact) { this.alternativeContact = alternativeContact; }
    public String getWorkPassType() { return workPassType; }
    public void setWorkPassType(String workPassType) { this.workPassType = workPassType; }
    public String getWorkPassNumber() { return workPassNumber; }
    public void setWorkPassNumber(String workPassNumber) { this.workPassNumber = workPassNumber; }
    public LocalDate getWorkPassExpiry() { return workPassExpiry; }
    public void setWorkPassExpiry(LocalDate workPassExpiry) { this.workPassExpiry = workPassExpiry; }
    public String getFinNumber() { return finNumber; }
    public void setFinNumber(String finNumber) { this.finNumber = finNumber; }
    public String getPassportNumber() { return passportNumber; }
    public void setPassportNumber(String passportNumber) { this.passportNumber = passportNumber; }
    public LocalDate getPassportExpiry() { return passportExpiry; }
    public void setPassportExpiry(LocalDate passportExpiry) { this.passportExpiry = passportExpiry; }
    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getBankAccountMasked() { return bankAccountMasked; }
    public void setBankAccountMasked(String bankAccountMasked) { this.bankAccountMasked = bankAccountMasked; }
    public String getBankAccountNumberMasked() { return bankAccountNumberMasked; }
    public void setBankAccountNumberMasked(String bankAccountNumberMasked) { this.bankAccountNumberMasked = bankAccountNumberMasked; }
    public BigDecimal getBasicPay() { return basicPay; }
    public void setBasicPay(BigDecimal basicPay) { this.basicPay = basicPay; }
    public BigDecimal getOvertimeRate() { return overtimeRate; }
    public void setOvertimeRate(BigDecimal overtimeRate) { this.overtimeRate = overtimeRate; }
    public String getSalaryPeriod() { return salaryPeriod; }
    public void setSalaryPeriod(String salaryPeriod) { this.salaryPeriod = salaryPeriod; }
    public BigDecimal getAllowancesTotal() { return allowancesTotal; }
    public void setAllowancesTotal(BigDecimal allowancesTotal) { this.allowancesTotal = allowancesTotal; }
    public LocalDate getPayrollStartDate() { return payrollStartDate; }
    public void setPayrollStartDate(LocalDate payrollStartDate) { this.payrollStartDate = payrollStartDate; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public UUID getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(UUID createdByUserId) { this.createdByUserId = createdByUserId; }
    public String getInvitationEmailStatus() { return invitationEmailStatus; }
    public void setInvitationEmailStatus(String invitationEmailStatus) { this.invitationEmailStatus = invitationEmailStatus; }
    public OnboardingStage getOnboardingStage() { return onboardingStage; }
    public void setOnboardingStage(OnboardingStage onboardingStage) { this.onboardingStage = onboardingStage; }
    public int getOnboardingProgress() { return onboardingProgress; }
    public void setOnboardingProgress(int onboardingProgress) { this.onboardingProgress = onboardingProgress; }
    public sg.eyota.workright.onboarding.entity.PipelineStatus getPipelineStatus() { return pipelineStatus; }
    public void setPipelineStatus(sg.eyota.workright.onboarding.entity.PipelineStatus pipelineStatus) {
        this.pipelineStatus = pipelineStatus;
    }
    public String getWorkerCategory() { return workerCategory; }
    public void setWorkerCategory(String workerCategory) { this.workerCategory = workerCategory; }
    public String getNationalityCode() { return nationalityCode; }
    public void setNationalityCode(String nationalityCode) { this.nationalityCode = nationalityCode; }
    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
