package sg.eyota.workright.enrollment.entity;

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
@Table(name = "employee_invitations")
public class EmployeeInvitationEntity extends AuditedEntity {

    public enum Status { PENDING, ACTIVATED, EXPIRED, REVOKED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String email;

    @Column(name = "invitation_token_hash")
    private String invitationTokenHash;

    @Column(name = "invitation_expires_at")
    private Instant invitationExpiresAt;

    /** Nullable until employee requests OTP on the activation page. */
    @Column(name = "otp_hash")
    private String otpHash;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "invitation_status")
    private Status status = Status.PENDING;

    /** Legacy / OTP window; prefer otpExpiresAt for OTP checks. */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "otp_expires_at")
    private Instant otpExpiresAt;

    @Column(name = "otp_last_sent_at")
    private Instant otpLastSentAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "max_attempts", nullable = false)
    private int maxAttempts = 5;

    @Column(name = "activated_at")
    private Instant activatedAt;

    @Column(name = "last_sent_at", nullable = false)
    private Instant lastSentAt;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Column(name = "email_delivery_status", nullable = false)
    private String emailDeliveryStatus = "PENDING";

    @Column(name = "email_error")
    private String emailError;

    @Column(name = "otp_used_at")
    private Instant otpUsedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getInvitationTokenHash() { return invitationTokenHash; }
    public void setInvitationTokenHash(String invitationTokenHash) { this.invitationTokenHash = invitationTokenHash; }
    public Instant getInvitationExpiresAt() { return invitationExpiresAt; }
    public void setInvitationExpiresAt(Instant invitationExpiresAt) { this.invitationExpiresAt = invitationExpiresAt; }
    public String getOtpHash() { return otpHash; }
    public void setOtpHash(String otpHash) { this.otpHash = otpHash; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getOtpExpiresAt() { return otpExpiresAt; }
    public void setOtpExpiresAt(Instant otpExpiresAt) { this.otpExpiresAt = otpExpiresAt; }
    public Instant getOtpLastSentAt() { return otpLastSentAt; }
    public void setOtpLastSentAt(Instant otpLastSentAt) { this.otpLastSentAt = otpLastSentAt; }
    public int getAttemptCount() { return attemptCount; }
    public void setAttemptCount(int attemptCount) { this.attemptCount = attemptCount; }
    public int getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(int maxAttempts) { this.maxAttempts = maxAttempts; }
    public Instant getActivatedAt() { return activatedAt; }
    public void setActivatedAt(Instant activatedAt) { this.activatedAt = activatedAt; }
    public Instant getLastSentAt() { return lastSentAt; }
    public void setLastSentAt(Instant lastSentAt) { this.lastSentAt = lastSentAt; }
    public UUID getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(UUID createdByUserId) { this.createdByUserId = createdByUserId; }
    public String getEmailDeliveryStatus() { return emailDeliveryStatus; }
    public void setEmailDeliveryStatus(String emailDeliveryStatus) { this.emailDeliveryStatus = emailDeliveryStatus; }
    public String getEmailError() { return emailError; }
    public void setEmailError(String emailError) { this.emailError = emailError; }
    public Instant getOtpUsedAt() { return otpUsedAt; }
    public void setOtpUsedAt(Instant otpUsedAt) { this.otpUsedAt = otpUsedAt; }
}
