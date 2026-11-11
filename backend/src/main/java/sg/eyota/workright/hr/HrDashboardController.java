package sg.eyota.workright.hr;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.hr.dto.HrDashboardStatsDto;

@RestController
@RequestMapping("/api/v1/hr/dashboard")
@PreAuthorize("hasAnyRole('HR','ADMIN')")
public class HrDashboardController {

    private final HrDashboardService dashboardService;

    public HrDashboardController(HrDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public HrDashboardStatsDto stats() {
        return dashboardService.stats();
    }
}
