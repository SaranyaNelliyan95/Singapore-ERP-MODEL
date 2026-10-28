package sg.eyota.workright.attendance;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.attendance.dto.AttendanceSessionDto;
import sg.eyota.workright.attendance.dto.ClockRequest;
import sg.eyota.workright.security.SecurityUtils;
import sg.eyota.workright.security.WorkrightUserDetails;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/clock-in")
    public AttendanceSessionDto clockIn(@Valid @RequestBody ClockRequest request) {
        WorkrightUserDetails user = SecurityUtils.currentUser();
        return attendanceService.clockIn(user.getUser().getEmployeeId(), request);
    }

    @PostMapping("/clock-out")
    public AttendanceSessionDto clockOut(@Valid @RequestBody ClockRequest request) {
        WorkrightUserDetails user = SecurityUtils.currentUser();
        return attendanceService.clockOut(user.getUser().getEmployeeId(), request);
    }

    @GetMapping("/me")
    public List<AttendanceSessionDto> me() {
        WorkrightUserDetails user = SecurityUtils.currentUser();
        return attendanceService.myHistory(user.getUser().getEmployeeId());
    }

    @GetMapping("/me/today")
    public ResponseEntity<AttendanceSessionDto> meToday() {
        WorkrightUserDetails user = SecurityUtils.currentUser();
        AttendanceSessionDto today = attendanceService.myToday(user.getUser().getEmployeeId());
        return today == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(today);
    }

    @GetMapping("/me/history")
    public List<AttendanceSessionDto> meHistory() {
        WorkrightUserDetails user = SecurityUtils.currentUser();
        return attendanceService.myHistory(user.getUser().getEmployeeId());
    }
}
