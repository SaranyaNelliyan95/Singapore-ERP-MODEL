package sg.eyota.workright.masterdata.entity;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import sg.eyota.workright.common.persistence.AuditedEntity;

@Entity
@Table(name = "leave_configurations")
public class LeaveConfigurationEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "annual_days", nullable = false, precision = 6, scale = 2)
    private BigDecimal annualDays;

    private String notes;

    @Column(name = "statutory_review_flag", nullable = false)
    private boolean statutoryReviewFlag;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "updated_by")
    private UUID updatedBy;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getAnnualDays() { return annualDays; }
    public void setAnnualDays(BigDecimal annualDays) { this.annualDays = annualDays; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public boolean isStatutoryReviewFlag() { return statutoryReviewFlag; }
    public void setStatutoryReviewFlag(boolean statutoryReviewFlag) { this.statutoryReviewFlag = statutoryReviewFlag; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public UUID getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(UUID updatedBy) { this.updatedBy = updatedBy; }
}
