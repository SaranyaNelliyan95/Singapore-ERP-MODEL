package sg.eyota.workright.attendance.entity;

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
@Table(name = "attendance_sessions")
public class AttendanceSessionEntity extends AuditedEntity {

    public enum SessionStatus { OPEN, CLOSED, REJECTED_ATTEMPT }
    public enum GeofenceResult { INSIDE, OUTSIDE, SKIPPED, UNKNOWN }
    public enum WorkMode { OFFICE, SITE, WFH }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "workplace_id")
    private UUID workplaceId;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "clock_in_at")
    private Instant clockInAt;

    @Column(name = "clock_out_at")
    private Instant clockOutAt;

    @Column(name = "clock_in_lat")
    private Double clockInLat;

    @Column(name = "clock_in_lng")
    private Double clockInLng;

    @Column(name = "clock_in_accuracy")
    private Double clockInAccuracy;

    @Column(name = "clock_out_lat")
    private Double clockOutLat;

    @Column(name = "clock_out_lng")
    private Double clockOutLng;

    @Column(name = "clock_out_accuracy")
    private Double clockOutAccuracy;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "geofence_result", columnDefinition = "geofence_result")
    private GeofenceResult geofenceResult;

    @Column(name = "distance_metres")
    private Double distanceMetres;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "attendance_session_status")
    private SessionStatus status = SessionStatus.OPEN;

    @Column(name = "late_minutes")
    private Integer lateMinutes;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "work_mode", columnDefinition = "attendance_work_mode")
    private WorkMode workMode;

    @Column(name = "client_captured_in_at")
    private Instant clientCapturedInAt;

    @Column(name = "client_captured_out_at")
    private Instant clientCapturedOutAt;

    @Column(name = "correction_reason")
    private String correctionReason;

    @Column(name = "corrected_by")
    private UUID correctedBy;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public UUID getWorkplaceId() {
        return workplaceId;
    }

    public void setWorkplaceId(UUID workplaceId) {
        this.workplaceId = workplaceId;
    }

    public LocalDate getAttendanceDate() {
        return attendanceDate;
    }

    public void setAttendanceDate(LocalDate attendanceDate) {
        this.attendanceDate = attendanceDate;
    }

    public Instant getClockInAt() {
        return clockInAt;
    }

    public void setClockInAt(Instant clockInAt) {
        this.clockInAt = clockInAt;
    }

    public Instant getClockOutAt() {
        return clockOutAt;
    }

    public void setClockOutAt(Instant clockOutAt) {
        this.clockOutAt = clockOutAt;
    }

    public Double getClockInLat() {
        return clockInLat;
    }

    public void setClockInLat(Double clockInLat) {
        this.clockInLat = clockInLat;
    }

    public Double getClockInLng() {
        return clockInLng;
    }

    public void setClockInLng(Double clockInLng) {
        this.clockInLng = clockInLng;
    }

    public Double getClockInAccuracy() {
        return clockInAccuracy;
    }

    public void setClockInAccuracy(Double clockInAccuracy) {
        this.clockInAccuracy = clockInAccuracy;
    }

    public Double getClockOutLat() {
        return clockOutLat;
    }

    public void setClockOutLat(Double clockOutLat) {
        this.clockOutLat = clockOutLat;
    }

    public Double getClockOutLng() {
        return clockOutLng;
    }

    public void setClockOutLng(Double clockOutLng) {
        this.clockOutLng = clockOutLng;
    }

    public Double getClockOutAccuracy() {
        return clockOutAccuracy;
    }

    public void setClockOutAccuracy(Double clockOutAccuracy) {
        this.clockOutAccuracy = clockOutAccuracy;
    }

    public GeofenceResult getGeofenceResult() {
        return geofenceResult;
    }

    public void setGeofenceResult(GeofenceResult geofenceResult) {
        this.geofenceResult = geofenceResult;
    }

    public Double getDistanceMetres() {
        return distanceMetres;
    }

    public void setDistanceMetres(Double distanceMetres) {
        this.distanceMetres = distanceMetres;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
    }

    public Integer getLateMinutes() {
        return lateMinutes;
    }

    public void setLateMinutes(Integer lateMinutes) {
        this.lateMinutes = lateMinutes;
    }

    public WorkMode getWorkMode() {
        return workMode;
    }

    public void setWorkMode(WorkMode workMode) {
        this.workMode = workMode;
    }

    public Instant getClientCapturedInAt() {
        return clientCapturedInAt;
    }

    public void setClientCapturedInAt(Instant clientCapturedInAt) {
        this.clientCapturedInAt = clientCapturedInAt;
    }

    public Instant getClientCapturedOutAt() {
        return clientCapturedOutAt;
    }

    public void setClientCapturedOutAt(Instant clientCapturedOutAt) {
        this.clientCapturedOutAt = clientCapturedOutAt;
    }

    public String getCorrectionReason() {
        return correctionReason;
    }

    public void setCorrectionReason(String correctionReason) {
        this.correctionReason = correctionReason;
    }

    public UUID getCorrectedBy() {
        return correctedBy;
    }

    public void setCorrectedBy(UUID correctedBy) {
        this.correctedBy = correctedBy;
    }
}
