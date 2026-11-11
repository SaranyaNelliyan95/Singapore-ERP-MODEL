package sg.eyota.workright.attendance;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

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
import sg.eyota.workright.onboarding.entity.PipelineStatus;
import sg.eyota.workright.onboarding.repository.CandidateOnboardingRepository;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowService;

@Service
public class AttendanceService {

    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceRejectAuditRepository rejectAuditRepository;
    private final WorkplaceRepository workplaceRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendancePolicyService policyService;
    private final EyotaProperties properties;
    private final Clock clock;
    private final ZoneId businessZone;
    private final OnboardingSgFlowService sgFlowService;
    private final CandidateOnboardingRepository onboardingRepository;

    public AttendanceService(
            AttendanceSessionRepository sessionRepository,
            AttendanceRejectAuditRepository rejectAuditRepository,
            WorkplaceRepository workplaceRepository,
            EmployeeRepository employeeRepository,
            AttendancePolicyService policyService,
            EyotaProperties properties,
            Clock clock,
            OnboardingSgFlowService sgFlowService,
            CandidateOnboardingRepository onboardingRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.rejectAuditRepository = rejectAuditRepository;
        this.workplaceRepository = workplaceRepository;
        this.employeeRepository = employeeRepository;
        this.policyService = policyService;
        this.properties = properties;
        this.clock = clock;
        this.businessZone = ZoneId.of(properties.timezone() != null ? properties.timezone() : "Asia/Singapore");
        this.sgFlowService = sgFlowService;
        this.onboardingRepository = onboardingRepository;
    }

    @Transactional
    public AttendanceSessionDto clockIn(UUID employeeId, ClockRequest request) {
        EmployeeEntity employee = requireEmployee(employeeId);
        requireReadyToWorkForAttendance(employee);
        boolean gpsMandatory = policyService.isGpsMandatory();
        requireLocationWhenMandatory(request, gpsMandatory);

        LocalDate today = LocalDate.now(clock.withZone(businessZone));
        sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, today).ifPresent(existing -> {
            if (existing.getClockInAt() != null) {
                throw new ApiException(HttpStatus.CONFLICT, "Conflict",
                        "Already clocked in for today — only one clock-in is allowed per day");
            }
        });

        WorkplaceEntity workplace = resolveWorkplace(employee, request.workplaceId(), gpsMandatory);
        AttendanceSessionEntity.WorkMode workMode = request.workMode() != null
                ? request.workMode()
                : AttendanceSessionEntity.WorkMode.OFFICE;

        AttendanceGeofenceEvaluator.GeofenceEvaluation geo;
        if (!gpsMandatory || request.latitude() == null || request.longitude() == null || workplace == null) {
            geo = new AttendanceGeofenceEvaluator.GeofenceEvaluation(
                    AttendanceSessionEntity.GeofenceResult.SKIPPED, 0, false);
        } else {
            validateAccuracy(request.accuracyMetres());
            geo = AttendanceGeofenceEvaluator.evaluate(
                    workplace, request.latitude(), request.longitude(), workMode);
            if (geo.rejected()) {
                recordReject(employeeId, request, workplace.getId(), "GEOFENCE_OUTSIDE",
                        "Clock-in outside geofence for mandatory GPS workplace");
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unprocessable Entity",
                        "Clock-in rejected: outside workplace geofence");
            }
        }

        Instant serverNow = Instant.now(clock);
        AttendanceSessionEntity session = sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)
                .orElseGet(AttendanceSessionEntity::new);
        session.setEmployeeId(employeeId);
        session.setWorkplaceId(workplace != null ? workplace.getId() : null);
        session.setAttendanceDate(today);
        session.setClockInAt(serverNow);
        if (gpsMandatory && request.latitude() != null) {
            session.setClockInLat(request.latitude());
            session.setClockInLng(request.longitude());
            session.setClockInAccuracy(request.accuracyMetres());
        } else {
            session.setClockInLat(null);
            session.setClockInLng(null);
            session.setClockInAccuracy(null);
        }
        session.setGeofenceResult(geo.result());
        session.setDistanceMetres(geo.distanceMetres() > 0 ? geo.distanceMetres() : null);
        session.setStatus(AttendanceSessionEntity.SessionStatus.OPEN);
        session.setWorkMode(workMode);
        if (request.clientCapturedAt() != null) {
            session.setClientCapturedInAt(request.clientCapturedAt().toInstant());
        }
        return toDto(sessionRepository.save(session), employee);
    }

    @Transactional
    public AttendanceSessionDto clockOut(UUID employeeId, ClockRequest request) {
        EmployeeEntity employee = requireEmployee(employeeId);
        boolean gpsMandatory = policyService.isGpsMandatory();
        requireLocationWhenMandatory(request, gpsMandatory);

        LocalDate today = LocalDate.now(clock.withZone(businessZone));
        AttendanceSessionEntity session = sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                        "No clock-in found for today — clock in first"));
        if (session.getStatus() == AttendanceSessionEntity.SessionStatus.CLOSED
                || session.getClockOutAt() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict",
                    "Already clocked out for today — only one clock-out is allowed per day");
        }
        if (session.getStatus() != AttendanceSessionEntity.SessionStatus.OPEN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "No open session to clock out");
        }

        WorkplaceEntity workplace = null;
        if (session.getWorkplaceId() != null) {
            workplace = workplaceRepository.findById(session.getWorkplaceId()).orElse(null);
        }
        AttendanceSessionEntity.WorkMode workMode = session.getWorkMode() != null
                ? session.getWorkMode()
                : AttendanceSessionEntity.WorkMode.OFFICE;

        AttendanceGeofenceEvaluator.GeofenceEvaluation geo;
        if (!gpsMandatory || request.latitude() == null || request.longitude() == null || workplace == null) {
            geo = new AttendanceGeofenceEvaluator.GeofenceEvaluation(
                    AttendanceSessionEntity.GeofenceResult.SKIPPED, 0, false);
        } else {
            validateAccuracy(request.accuracyMetres());
            geo = AttendanceGeofenceEvaluator.evaluate(
                    workplace, request.latitude(), request.longitude(), workMode);
            if (geo.rejected()) {
                recordReject(employeeId, request, workplace.getId(), "GEOFENCE_OUTSIDE",
                        "Clock-out outside geofence for mandatory GPS workplace");
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unprocessable Entity",
                        "Clock-out rejected: outside workplace geofence");
            }
        }

        Instant serverNow = Instant.now(clock);
        session.setClockOutAt(serverNow);
        if (gpsMandatory && request.latitude() != null) {
            session.setClockOutLat(request.latitude());
            session.setClockOutLng(request.longitude());
            session.setClockOutAccuracy(request.accuracyMetres());
        } else {
            session.setClockOutLat(null);
            session.setClockOutLng(null);
            session.setClockOutAccuracy(null);
        }
        session.setGeofenceResult(geo.result());
        session.setDistanceMetres(geo.distanceMetres() > 0 ? geo.distanceMetres() : null);
        session.setStatus(AttendanceSessionEntity.SessionStatus.CLOSED);
        if (request.clientCapturedAt() != null) {
            session.setClientCapturedOutAt(request.clientCapturedAt().toInstant());
        }
        return toDto(sessionRepository.save(session), employee);
    }

    @Transactional(readOnly = true)
    public List<AttendanceSessionDto> myHistory(UUID employeeId) {
        EmployeeEntity employee = requireEmployee(employeeId);
        return sessionRepository.findByEmployeeIdOrderByAttendanceDateDesc(employeeId).stream()
                .map(s -> toDto(s, employee))
                .toList();
    }

    @Transactional(readOnly = true)
    public AttendanceSessionDto myToday(UUID employeeId) {
        LocalDate today = LocalDate.now(clock.withZone(businessZone));
        EmployeeEntity employee = requireEmployee(employeeId);
        return sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)
                .map(s -> toDto(s, employee))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<AttendanceSessionDto> hrList(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(businessZone).minusDays(30);
        LocalDate end = to != null ? to : LocalDate.now(businessZone);
        List<AttendanceSessionEntity> sessions =
                sessionRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(start, end);
        Map<UUID, EmployeeEntity> employees = employeeRepository.findAllById(
                        sessions.stream().map(AttendanceSessionEntity::getEmployeeId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(EmployeeEntity::getId, Function.identity()));
        return sessions.stream()
                .map(s -> toDto(s, employees.get(s.getEmployeeId())))
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
        EmployeeEntity employee = employeeRepository.findById(session.getEmployeeId()).orElse(null);
        return toDto(sessionRepository.save(session), employee);
    }

    private AttendanceSessionDto toDto(AttendanceSessionEntity session, EmployeeEntity employee) {
        String name = employee != null ? employee.getFullName() : null;
        String code = employee != null ? employee.getEmployeeCode() : null;
        return AttendanceSessionDto.from(session, name, code);
    }

    /**
     * Resolves workplace for geofencing. When GPS is Off, workplace is optional so employees
     * without an assigned site can still clock in.
     */
    private WorkplaceEntity resolveWorkplace(
            EmployeeEntity employee,
            UUID requestedWorkplaceId,
            boolean gpsMandatory
    ) {
        UUID workplaceId = requestedWorkplaceId != null ? requestedWorkplaceId : employee.getWorkplaceId();
        if (workplaceId != null) {
            WorkplaceEntity workplace = workplaceRepository.findById(workplaceId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Workplace not found"));
            if (!workplace.isActive()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Workplace is inactive");
            }
            return workplace;
        }

        // Prefer any active HQ/default workplace so GPS-on clocking still works after enrollment
        List<WorkplaceEntity> active = workplaceRepository.findByActiveTrue();
        if (!active.isEmpty()) {
            return active.getFirst();
        }

        if (!gpsMandatory) {
            // GPS Off: allow punch with no workplace row
            return null;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                "Workplace could not be resolved — assign a workplace to the employee or create an active workplace");
    }

    private void requireLocationWhenMandatory(ClockRequest request, boolean gpsMandatory) {
        if (!gpsMandatory) {
            return;
        }
        if (request.latitude() == null || request.longitude() == null || request.accuracyMetres() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                    "GPS location is required — Admin has GPS attendance turned On");
        }
        if (request.latitude() < -90 || request.latitude() > 90
                || request.longitude() < -180 || request.longitude() > 180) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Invalid GPS coordinates");
        }
    }

    private void validateAccuracy(Double accuracyMetres) {
        if (accuracyMetres == null || accuracyMetres <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "GPS accuracy must be positive");
        }
        if (accuracyMetres > properties.attendance().maxAccuracyMetres()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Unprocessable Entity",
                    "GPS accuracy too low (max " + properties.attendance().maxAccuracyMetres() + "m). "
                            + "Move outdoors or wait for a better fix, then retry.");
        }
    }

    /**
     * When SG onboarding flow is on and the employee has an onboarding record, clock-in is allowed
     * only after HR completes Ready to Work. Legacy employees without onboarding are unaffected.
     */
    private void requireReadyToWorkForAttendance(EmployeeEntity employee) {
        if (!sgFlowService.enabled()) {
            return;
        }
        if (employee.getPipelineStatus() == PipelineStatus.READY_TO_WORK) {
            return;
        }
        if (onboardingRepository.findByEmployeeId(employee.getId()).isEmpty()) {
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "Not Ready",
                "Attendance is available only after HR marks Complete Ready to Work");
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
