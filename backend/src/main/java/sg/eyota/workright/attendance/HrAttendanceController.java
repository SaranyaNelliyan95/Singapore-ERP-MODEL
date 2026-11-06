package sg.eyota.workright.attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.attendance.dto.AttendanceCorrectionRequest;
import sg.eyota.workright.attendance.dto.AttendanceSessionDto;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/hr/attendance")
@PreAuthorize("hasAnyRole('HR','ADMIN')")
public class HrAttendanceController {

    private final AttendanceService attendanceService;

    public HrAttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping
    public List<AttendanceSessionDto> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return attendanceService.hrList(from, to);
    }

    @PostMapping("/{id}/correct")
    public AttendanceSessionDto correct(@PathVariable UUID id, @Valid @RequestBody AttendanceCorrectionRequest request) {
        UUID hrUserId = SecurityUtils.currentUser().getUserId();
        return attendanceService.correct(id, hrUserId, request);
    }
}
