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
@Table(name = "work_pass_records")
public class WorkPassRecordEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, unique = true)
    private UUID employeeId;

    @Column(name = "onboarding_id", nullable = false, unique = true)
    private UUID onboardingId;

    @Column(name = "ipa_number")
    private String ipaNumber;

    @Column(name = "ipa_issue_date")
    private LocalDate ipaIssueDate;

    @Column(name = "ipa_expiry_date")
    private LocalDate ipaExpiryDate;

    @Column(name = "wp_number")
    private String wpNumber;

    @Column(name = "wp_issue_date")
    private LocalDate wpIssueDate;

    @Column(name = "wp_expiry_date")
    private LocalDate wpExpiryDate;

    @Column(name = "fin_number")
    private String finNumber;

    @Column(name = "card_collected", nullable = false)
    private boolean cardCollected;

    /** SG-flow v2 optional Temporary Permit + IPA extension fields. */
    @Column(name = "ipa_extension_requested")
    private Boolean ipaExtensionRequested;

    @Column(name = "tp_number")
    private String tpNumber;

    @Column(name = "tp_issue_date")
    private LocalDate tpIssueDate;

    @Column(name = "tp_expiry_date")
    private LocalDate tpExpiryDate;

    @Column(name = "tp_valid", nullable = false)
    private boolean tpValid;

    private String notes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public UUID getOnboardingId() { return onboardingId; }
    public void setOnboardingId(UUID onboardingId) { this.onboardingId = onboardingId; }
    public String getIpaNumber() { return ipaNumber; }
    public void setIpaNumber(String ipaNumber) { this.ipaNumber = ipaNumber; }
    public LocalDate getIpaIssueDate() { return ipaIssueDate; }
    public void setIpaIssueDate(LocalDate ipaIssueDate) { this.ipaIssueDate = ipaIssueDate; }
    public LocalDate getIpaExpiryDate() { return ipaExpiryDate; }
    public void setIpaExpiryDate(LocalDate ipaExpiryDate) { this.ipaExpiryDate = ipaExpiryDate; }
    public String getWpNumber() { return wpNumber; }
    public void setWpNumber(String wpNumber) { this.wpNumber = wpNumber; }
    public LocalDate getWpIssueDate() { return wpIssueDate; }
    public void setWpIssueDate(LocalDate wpIssueDate) { this.wpIssueDate = wpIssueDate; }
    public LocalDate getWpExpiryDate() { return wpExpiryDate; }
    public void setWpExpiryDate(LocalDate wpExpiryDate) { this.wpExpiryDate = wpExpiryDate; }
    public String getFinNumber() { return finNumber; }
    public void setFinNumber(String finNumber) { this.finNumber = finNumber; }
    public boolean isCardCollected() { return cardCollected; }
    public void setCardCollected(boolean cardCollected) { this.cardCollected = cardCollected; }
    public Boolean getIpaExtensionRequested() { return ipaExtensionRequested; }
    public void setIpaExtensionRequested(Boolean ipaExtensionRequested) {
        this.ipaExtensionRequested = ipaExtensionRequested;
    }
    public String getTpNumber() { return tpNumber; }
    public void setTpNumber(String tpNumber) { this.tpNumber = tpNumber; }
    public LocalDate getTpIssueDate() { return tpIssueDate; }
    public void setTpIssueDate(LocalDate tpIssueDate) { this.tpIssueDate = tpIssueDate; }
    public LocalDate getTpExpiryDate() { return tpExpiryDate; }
    public void setTpExpiryDate(LocalDate tpExpiryDate) { this.tpExpiryDate = tpExpiryDate; }
    public boolean isTpValid() { return tpValid; }
    public void setTpValid(boolean tpValid) { this.tpValid = tpValid; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
