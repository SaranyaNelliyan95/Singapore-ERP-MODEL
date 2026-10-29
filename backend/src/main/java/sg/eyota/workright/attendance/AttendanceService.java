package sg.eyota.workright.attendance;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.attendance.dto.AttendanceCorrectionRequest;
import sg.eyota.workright.attendance.dto.AttendanceSessionDto;
import sg.eyota.workright.attendance.dto.ClockRequest;
import sg.eyota.workright.attendance.entity.AttendanceRejectAuditEntity;
import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;
import sg.eyota.workright.attendance.entity.WorkplaceEntity;
import sg.eyota.workright.attendance.repository.AttendanceRejectAuditRepository;
import sg.eyota.workright.attendance.repository.AttendanceSessionRepository;
import sg.eyota.workright.attendance.repository.WorkplaceRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.config.EyotaProperties;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;

@Service
public class AttendanceService {

    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceRejectAuditRepository rejectAuditRepository;
    private final WorkplaceRepository workplaceRepository;
    private final EmployeeRepository employeeRepository;
    private final EyotaProperties properties;
    private final Clock clock;
    private final ZoneId businessZone;

    public AttendanceService(
            AttendanceSessionRepository sessionRepository,
            AttendanceRejectAuditRepository rejectAuditRepository,
            WorkplaceRepository workplaceRepository,
            EmployeeRepository employeeRepository,
            EyotaProperties properties,
            Clock clock
    ) {
        this.sessionRepository = sessionRepository;
        this.rejectAuditRepository = rejectAuditRepository;
        this.workplaceRepository = workplaceRepository;
        this.employeeRepository = employeeRepository;
        this.properties = properties;
        this.clock = clock;
        this.businessZone = ZoneId.of(properties.timezone() != null ? properties.timezone() : "Asia/Singapore");
    }

    @Transactional
    public AttendanceSessionDto clockIn(UUID employeeId, ClockRequest request) {
        EmployeeEntity employee = requireEmployee(employeeId);
        validateCoordinates(request);
        validateAccuracy(request.accuracyMetres());

        LocalDate today = LocalDate.now(clock.withZone(businessZone));
        sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, today).ifPresent(existing -> {
            if (existing.getStatus() == AttendanceSessionEntity.SessionStatus.OPEN) {
                throw new ApiException(HttpStatus.CONFLICT, "Conflict",
                        "Already clocked in — clock out before starting a new session");
            }
        });

        WorkplaceEntity workplace = resolveWorkplace(employee, request.workplaceId());
        AttendanceSessionEntity.WorkMode workMode = request.workMode() != null
                ? request.workMode()
                : AttendanceSessionEntity.WorkMode.OFFICE;

        AttendanceGeofenceEvaluator.GeofenceEvaluation geo = AttendanceGeofenceEvaluator.evaluate(
                workplace, request.latitude(), request.longitude(), workMode);
        if (geo.rejected()) {
            recordReject(employeeId, request, workplace.getId(), "GEOFENCE_OUTSIDE",
                    "Clock-in outside geofence for mandatory GPS workplace");
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unprocessable Entity",
                    "Clock-in rejected: outside workplace geofence");
        }

        Instant serverNow = Instant.now(clock);
        AttendanceSessionEntity session = sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)
                .orElseGet(AttendanceSessionEntity::new);
        session.setEmployeeId(employeeId);
        session.setWorkplaceId(workplace.getId());
        session.setAttendanceDate(today);
        session.setClockInAt(serverNow);
        session.setClockInLat(request.latitude());
        session.setClockInLng(request.longitude());
        session.setClockInAccuracy(request.accuracyMetres());
        session.setGeofenceResult(geo.result());
        session.setDistanceMetres(geo.distanceMetres());
        session.setStatus(AttendanceSessionEntity.SessionStatus.OPEN);
        session.setWorkMode(workMode);
        if (request.clientCapturedAt() != null) {
            session.setClientCapturedInAt(request.clientCapturedAt().toInstant());
        }
        return AttendanceSessionDto.from(sessionRepository.save(session));
    }

    @Transactional
    public AttendanceSessionDto clockOut(UUID employeeId, ClockRequest request) {
        requireEmployee(employeeId);
        validateCoordinates(request);
        validateAccuracy(request.accuracyMetres());

        LocalDate today = LocalDate.now(clock.withZone(businessZone));
        AttendanceSessionEntity session = sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                        "No open attendance session for today"));
        if (session.getStatus() != AttendanceSessionEntity.SessionStatus.OPEN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "No open session to clock out");
        }

        WorkplaceEntity workplace = workplaceRepository.findById(session.getWorkplaceId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Workplace not found"));
        AttendanceSessionEntity.WorkMode workMode = session.getWorkMode() != null
                ? session.getWorkMode()
                : AttendanceSessionEntity.WorkMode.OFFICE;

        AttendanceGeofenceEvaluator.GeofenceEvaluation geo = AttendanceGeofenceEvaluator.evaluate(
                workplace, request.latitude(), request.longitude(), workMode);
        if (geo.rejected()) {
            recordReject(employeeId, request, workplace.getId(), "GEOFENCE_OUTSIDE",
                    "Clock-out outside geofence for mandatory GPS workplace");
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unprocessable Entity",
                    "Clock-out rejected: outside workplace geofence");
        }

        Instant serverNow = Instant.now(clock);
        session.setClockOutAt(serverNow);
        session.setClockOutLat(request.latitude());
        session.setClockOutLng(request.longitude());
        session.setClockOutAccuracy(request.accuracyMetres());
        session.setGeofenceResult(geo.result());
        session.setDistanceMetres(geo.distanceMetres());
        session.setStatus(AttendanceSessionEntity.SessionStatus.CLOSED);
        if (request.clientCapturedAt() != null) {
            session.setClientCapturedOutAt(request.clientCapturedAt().toInstant());
        }
        return AttendanceSessionDto.from(sessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<AttendanceSessionDto> myHistory(UUID employeeId) {
        return sessionRepository.findByEmployeeIdOrderByAttendanceDateDesc(employeeId).stream()
                .map(AttendanceSessionDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AttendanceSessionDto myToday(UUID employeeId) {
        LocalDate today = LocalDate.now(clock.withZone(businessZone));
        return sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)
                .map(AttendanceSessionDto::from)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<AttendanceSessionDto> hrList(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(businessZone).minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now(businessZone);
        return sessionRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(start, end).stream()
                .map(AttendanceSessionDto::from)
                .toList();
    }

    @Transactional
    public AttendanceSessionDto correct(UUID sessionId, UUID hrUserId, AttendanceCorrectionRequest request) {
        AttendanceSessionEntity session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Session not found"));
        if (request.clockInAt() != null) {
            session.setClockInAt(request.clockInAt());
        }
        if (request.clockOutAt() != null) {
            session.setClockOutAt(request.clockOutAt());
        }
        session.setCorrectionReason(request.correctionReason());
        session.setCorrectedBy(hrUserId);
        if (session.getClockOutAt() != null) {
            session.setStatus(AttendanceSessionEntity.SessionStatus.CLOSED);
        } else if (session.getClockInAt() != null) {
            session.setStatus(AttendanceSessionEntity.SessionStatus.OPEN);
        }
        return AttendanceSessionDto.from(sessionRepository.save(session));
    }

    private WorkplaceEntity resolveWorkplace(EmployeeEntity employee, UUID requestedWorkplaceId) {
        UUID workplaceId = requestedWorkplaceId != null ? requestedWorkplaceId : employee.getWorkplaceId();
        if (workplaceId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Workplace could not be resolved");
        }
        WorkplaceEntity workplace = workplaceRepository.findById(workplaceId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Workplace not found"));
        if (!workplace.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Workplace is inactive");
        }
        return workplace;
    }

    private void validateCoordinates(ClockRequest request) {
        if (request.latitude() < -90 || request.latitude() > 90
                || request.longitude() < -180 || request.longitude() > 180) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid GPS coordinates");
        }
    }

    private void validateAccuracy(double accuracyMetres) {
        if (accuracyMetres <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "GPS accuracy must be positive");
        }
        if (accuracyMetres > properties.attendance().maxAccuracyMetres()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unprocessable Entity",
                    "GPS accuracy too low (max " + properties.attendance().maxAccuracyMetres() + "m)");
        }
    }

    private EmployeeEntity requireEmployee(UUID employeeId) {
        if (employeeId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "User is not linked to an employee");
        }
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
    }

    private void recordReject(UUID employeeId, ClockRequest request, UUID workplaceId, String code, String message) {
        AttendanceRejectAuditEntity audit = new AttendanceRejectAuditEntity();
        audit.setEmployeeId(employeeId);
        audit.setAttemptedAt(Instant.now(clock));
        audit.setLatitude(request.latitude());
        audit.setLongitude(request.longitude());
        audit.setAccuracy(request.accuracyMetres());
        audit.setReasonCode(code);
        audit.setMessage(message);
        audit.setWorkplaceId(workplaceId);
        rejectAuditRepository.save(audit);
    }
}
