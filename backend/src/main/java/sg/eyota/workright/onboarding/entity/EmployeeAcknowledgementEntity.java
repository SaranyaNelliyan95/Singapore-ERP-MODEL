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
@Table(name = "employee_acknowledgements")
public class EmployeeAcknowledgementEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "onboarding_id", nullable = false)
    private UUID onboardingId;

    @Column(name = "ack_type", nullable = false)
    private String ackType;

    @Column(nullable = false)
    private boolean acknowledged;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "ip_address")
    private String ipAddress;

    private String notes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public UUID getOnboardingId() { return onboardingId; }
    public void setOnboardingId(UUID onboardingId) { this.onboardingId = onboardingId; }
    public String getAckType() { return ackType; }
    public void setAckType(String ackType) { this.ackType = ackType; }
    public boolean isAcknowledged() { return acknowledged; }
    public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }
    public Instant getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(Instant acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
