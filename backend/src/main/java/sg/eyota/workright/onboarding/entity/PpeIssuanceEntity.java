package sg.eyota.workright.onboarding.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import sg.eyota.workright.common.persistence.AuditedEntity;

@Entity
@Table(name = "ppe_issuance")
public class PpeIssuanceEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "onboarding_id", nullable = false)
    private UUID onboardingId;

    @Column(name = "item_code", nullable = false)
    private String itemCode;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "issued_at")
    private Instant issuedAt;

    @Column(name = "issued_by_user_id")
    private UUID issuedByUserId;

    @Column(name = "employee_confirmed", nullable = false)
    private boolean employeeConfirmed;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    private String notes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public UUID getOnboardingId() { return onboardingId; }
    public void setOnboardingId(UUID onboardingId) { this.onboardingId = onboardingId; }
    public String getItemCode() { return itemCode; }
    public void setItemCode(String itemCode) { this.itemCode = itemCode; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public Instant getIssuedAt() { return issuedAt; }
    public void setIssuedAt(Instant issuedAt) { this.issuedAt = issuedAt; }
    public UUID getIssuedByUserId() { return issuedByUserId; }
    public void setIssuedByUserId(UUID issuedByUserId) { this.issuedByUserId = issuedByUserId; }
    public boolean isEmployeeConfirmed() { return employeeConfirmed; }
    public void setEmployeeConfirmed(boolean employeeConfirmed) { this.employeeConfirmed = employeeConfirmed; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(Instant confirmedAt) { this.confirmedAt = confirmedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
