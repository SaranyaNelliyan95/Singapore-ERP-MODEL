package sg.eyota.workright.hr;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.attendance.AttendanceService;
import sg.eyota.workright.attendance.dto.AttendanceSessionDto;
import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;
import sg.eyota.workright.claims.ClaimService;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.hr.dto.HrDashboardStatsDto;
import sg.eyota.workright.leave.LeaveService;
import sg.eyota.workright.onboarding.OnboardingPipelineService;

@Service
public class HrDashboardService {

    private final EmployeeRepository employeeRepository;
    private final LeaveService leaveService;
    private final ClaimService claimService;
    private final AttendanceService attendanceService;
    private final OnboardingPipelineService onboardingPipelineService;

    public HrDashboardService(
            EmployeeRepository employeeRepository,
            LeaveService leaveService,
            ClaimService claimService,
            AttendanceService attendanceService,
            OnboardingPipelineService onboardingPipelineService
    ) {
        this.employeeRepository = employeeRepository;
        this.leaveService = leaveService;
        this.claimService = claimService;
        this.attendanceService = attendanceService;
        this.onboardingPipelineService = onboardingPipelineService;
    }

    @Transactional(readOnly = true)
    public HrDashboardStatsDto stats() {
        List<EmployeeEntity> employees = employeeRepository.findAll().stream()
                .filter(e -> e.getEmploymentStatus() != EmployeeEntity.EmploymentStatus.RESIGNED
                        && e.getEmploymentStatus() != EmployeeEntity.EmploymentStatus.TERMINATED)
                .toList();

        int local = 0;
        int pr = 0;
        int foreign = 0;
        int onLeave = 0;
        int passesExpiring = 0;
        LocalDate today = LocalDate.now();
        LocalDate limit = today.plusDays(90);

        for (EmployeeEntity e : employees) {
            WorkerBucket bucket = classify(e);
            switch (bucket) {
                case LOCAL -> local++;
                case PR -> pr++;
                case FOREIGN -> foreign++;
            }
            if (e.getEmploymentStatus() == EmployeeEntity.EmploymentStatus.ON_LEAVE) {
                onLeave++;
            }
            LocalDate expiry = e.getWorkPassExpiry();
            if (expiry != null && !expiry.isBefore(today) && !expiry.isAfter(limit)) {
                passesExpiring++;
            }
        }

        int pendingLeaves = leaveService.pendingForHr().size();
        int pendingClaims = claimService.pending().size();
        int pendingDocuments = onboardingPipelineService.latestRequests().size();

        List<AttendanceSessionDto> todaySessions = attendanceService.hrList(today, today);
        int present = 0;
        for (AttendanceSessionDto s : todaySessions) {
            if (s.status() == AttendanceSessionEntity.SessionStatus.OPEN
                    || s.status() == AttendanceSessionEntity.SessionStatus.CLOSED) {
                present++;
            }
        }
        int attendanceRate = employees.isEmpty()
                ? 0
                : (int) Math.round((present * 100.0) / employees.size());

        return new HrDashboardStatsDto(
                employees.size(),
                local,
                pr,
                foreign,
                onLeave,
                passesExpiring,
                attendanceRate,
                pendingLeaves,
                pendingClaims,
                pendingDocuments,
                0,
                "Live API · queues synced"
        );
    }

    private static WorkerBucket classify(EmployeeEntity e) {
        String pass = e.getWorkPassType() == null ? "" : e.getWorkPassType().trim().toUpperCase(Locale.ROOT);
        String nationality = e.getNationality() == null ? "" : e.getNationality().trim().toUpperCase(Locale.ROOT);
        if (pass.contains("PR") || nationality.contains("PR") || nationality.contains("PERMANENT RESIDENT")) {
            return WorkerBucket.PR;
        }
        if (!pass.isBlank()
                || nationality.contains("INDIAN")
                || nationality.contains("BANGLADESH")
                || nationality.contains("CHINA")
                || nationality.contains("MYANMAR")
                || nationality.contains("MALAYSIA")
                || nationality.contains("PHILIPPINE")
                || nationality.contains("INDONESIA")) {
            // Foreign worker / pass holder signal
            if (nationality.contains("SINGAPORE") && pass.isBlank()) {
                return WorkerBucket.LOCAL;
            }
            if (!pass.isBlank() || !nationality.contains("SINGAPORE")) {
                return WorkerBucket.FOREIGN;
            }
        }
        if (nationality.contains("SINGAPORE") || pass.isBlank()) {
            return WorkerBucket.LOCAL;
        }
        return WorkerBucket.FOREIGN;
    }

    private enum WorkerBucket { LOCAL, PR, FOREIGN }
}
