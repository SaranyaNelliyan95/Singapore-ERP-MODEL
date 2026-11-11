package sg.eyota.workright.hr.dto;

public record HrDashboardStatsDto(
        int totalEmployees,
        int localCount,
        int prCount,
        int foreignCount,
        int onLeaveToday,
        int passesExpiring90,
        int attendanceRateToday,
        int pendingLeaves,
        int pendingClaims,
        int pendingDocuments,
        int pendingBankRequests,
        String payrollStatus
) {}
