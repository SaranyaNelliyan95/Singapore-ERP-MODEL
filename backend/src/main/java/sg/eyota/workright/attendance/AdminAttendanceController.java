package sg.eyota.workright.attendance;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.attendance.dto.AttendanceGpsPolicyDto;
import sg.eyota.workright.attendance.dto.AttendanceSessionDto;
import sg.eyota.workright.attendance.dto.SetGpsMandatoryRequest;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/admin/attendance")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAttendanceController {

    private final AttendanceService attendanceService;
    private final AttendancePolicyService policyService;

    public AdminAttendanceController(
            AttendanceService attendanceService,
            AttendancePolicyService policyService
    ) {
        this.attendanceService = attendanceService;
        this.policyService = policyService;
    }

    @GetMapping
    public List<AttendanceSessionDto> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return attendanceService.hrList(from, to);
    }

    @GetMapping("/gps-policy")
    public AttendanceGpsPolicyDto getGpsPolicy() {
        return policyService.getPolicy();
    }

    @PutMapping("/gps-policy")
    public AttendanceGpsPolicyDto setGpsPolicy(@Valid @RequestBody SetGpsMandatoryRequest request) {
        return policyService.setGpsMandatory(
                Boolean.TRUE.equals(request.gpsMandatory()),
                SecurityUtils.currentUser().getUserId());
    }
}
