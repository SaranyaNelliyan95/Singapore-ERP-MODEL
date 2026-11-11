package sg.eyota.workright.attendance;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sg.eyota.workright.attendance.dto.ClockRequest;
import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;
import sg.eyota.workright.attendance.entity.WorkplaceEntity;
import sg.eyota.workright.attendance.repository.AttendanceRejectAuditRepository;
import sg.eyota.workright.attendance.repository.AttendanceSessionRepository;
import sg.eyota.workright.attendance.repository.WorkplaceRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.config.EyotaProperties;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock
    AttendanceSessionRepository sessionRepository;
    @Mock
    AttendanceRejectAuditRepository rejectAuditRepository;
    @Mock
    WorkplaceRepository workplaceRepository;
    @Mock
    EmployeeRepository employeeRepository;
    @Mock
    AttendancePolicyService policyService;

    AttendanceService service;
    UUID employeeId;
    UUID workplaceId;
    ZoneId sg = ZoneId.of("Asia/Singapore");
    Clock fixedClock;

    @BeforeEach
    void setUp() {
        fixedClock = Clock.fixed(Instant.parse("2026-03-17T01:00:00Z"), sg);
        EyotaProperties props = new EyotaProperties(
                "Asia/Singapore",
                new EyotaProperties.Cors("http://localhost:4200"),
                new EyotaProperties.Security("test_jwt_secret_key_at_least_32_chars_long", 60, "", ""),
                new EyotaProperties.Attendance(true, 150, 20000, 150),
                new EyotaProperties.Enrollment(2, 120, 72, 30, 5, false, "http://localhost:4200/activate-account")
        );
        service = new AttendanceService(
                sessionRepository,
                rejectAuditRepository,
                workplaceRepository,
                employeeRepository,
                policyService,
                props,
                fixedClock);
        employeeId = UUID.randomUUID();
        workplaceId = UUID.randomUUID();
        when(policyService.isGpsMandatory()).thenReturn(true);
    }

    @Test
    void clockIn_success_atWorkplace() {
        EmployeeEntity employee = employee();
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        WorkplaceEntity wp = workplace();
        when(workplaceRepository.findById(workplaceId)).thenReturn(Optional.of(wp));
        LocalDate businessDate = LocalDate.now(fixedClock.withZone(sg));
        when(sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, businessDate))
                .thenReturn(Optional.empty());
        when(sessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ClockRequest req = new ClockRequest(1.2916, 103.7803, 10d, null, null, AttendanceSessionEntity.WorkMode.OFFICE);
        var result = service.clockIn(employeeId, req);
        assertEquals(AttendanceSessionEntity.SessionStatus.OPEN, result.status());
        verify(sessionRepository).save(any());
    }

    @Test
    void clockIn_rejectsPoorAccuracy() {
        EmployeeEntity employee = employee();
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));

        ClockRequest req = new ClockRequest(1.2916, 103.7803, 200d, null, workplaceId, AttendanceSessionEntity.WorkMode.OFFICE);
        assertThrows(ApiException.class, () -> service.clockIn(employeeId, req));
    }

    @Test
    void clockIn_allowsWhenGpsOffWithoutCoordinates() {
        when(policyService.isGpsMandatory()).thenReturn(false);
        EmployeeEntity employee = employee();
        employee.setWorkplaceId(null); // enrolled staff often have no workplace yet
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        when(workplaceRepository.findByActiveTrue()).thenReturn(java.util.List.of());
        LocalDate businessDate = LocalDate.now(fixedClock.withZone(sg));
        when(sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, businessDate))
                .thenReturn(Optional.empty());
        when(sessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ClockRequest req = new ClockRequest(null, null, null, null, null, AttendanceSessionEntity.WorkMode.OFFICE);
        var result = service.clockIn(employeeId, req);
        assertEquals(AttendanceSessionEntity.GeofenceResult.SKIPPED, result.geofenceResult());
    }

    @Test
    void clockIn_rejectsSecondClockInSameDay() {
        EmployeeEntity employee = employee();
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        LocalDate businessDate = LocalDate.now(fixedClock.withZone(sg));
        AttendanceSessionEntity existing = new AttendanceSessionEntity();
        existing.setClockInAt(Instant.now(fixedClock));
        existing.setStatus(AttendanceSessionEntity.SessionStatus.OPEN);
        when(sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, businessDate))
                .thenReturn(Optional.of(existing));

        ClockRequest req = new ClockRequest(1.2916, 103.7803, 10d, null, null, AttendanceSessionEntity.WorkMode.OFFICE);
        assertThrows(ApiException.class, () -> service.clockIn(employeeId, req));
    }

    @Test
    void clockOut_requiresOpenSession() {
        EmployeeEntity employee = employee();
        when(employeeRepository.findById(employeeId)).thenReturn(Optional.of(employee));
        LocalDate businessDate = LocalDate.now(fixedClock.withZone(sg));
        when(sessionRepository.findByEmployeeIdAndAttendanceDate(employeeId, businessDate))
                .thenReturn(Optional.empty());

        ClockRequest req = new ClockRequest(1.2916, 103.7803, 10d, null, null, AttendanceSessionEntity.WorkMode.OFFICE);
        assertThrows(ApiException.class, () -> service.clockOut(employeeId, req));
    }

    private EmployeeEntity employee() {
        EmployeeEntity employee = new EmployeeEntity();
        employee.setId(employeeId);
        employee.setWorkplaceId(workplaceId);
        employee.setFullName("Test Employee");
        employee.setEmployeeCode("EYB01");
        return employee;
    }

    private WorkplaceEntity workplace() {
        WorkplaceEntity wp = new WorkplaceEntity();
        wp.setId(workplaceId);
        wp.setLatitude(1.2916);
        wp.setLongitude(103.7803);
        wp.setRadiusMetres(200);
        wp.setActive(true);
        wp.setGpsPolicy(WorkplaceEntity.GpsPolicy.MANDATORY);
        wp.setWfhAllowed(true);
        return wp;
    }
}
