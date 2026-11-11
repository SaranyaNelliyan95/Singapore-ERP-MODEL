package sg.eyota.workright.leave;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.leave.entity.LeaveRequestEntity;
import sg.eyota.workright.leave.entity.LeaveTypeEntity;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/leave")
public class LeaveController {

    private final LeaveService leaveService;

    public LeaveController(LeaveService leaveService) {
        this.leaveService = leaveService;
    }

    @GetMapping("/types")
    public List<LeaveTypeEntity> types() {
        return leaveService.listTypes();
    }

    @PostMapping("/types")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public LeaveTypeEntity createType(@RequestBody LeaveTypeEntity type) {
        return leaveService.createType(type);
    }

    @GetMapping("/requests/me")
    public List<LeaveRequestEntity> myRequests() {
        UUID employeeId = SecurityUtils.currentUser().getUser().getEmployeeId();
        return leaveService.myRequests(employeeId);
    }

    @GetMapping("/balances/me")
    public List<?> myBalances() {
        UUID employeeId = SecurityUtils.currentUser().getUser().getEmployeeId();
        return leaveService.balances(employeeId);
    }

    @PostMapping("/requests")
    public LeaveRequestEntity create(@RequestBody LeaveRequestEntity request) {
        UUID employeeId = SecurityUtils.currentUser().getUser().getEmployeeId();
        return leaveService.createRequest(employeeId, request);
    }

    @PostMapping("/requests/{id}/submit")
    public LeaveRequestEntity submit(@PathVariable UUID id) {
        UUID employeeId = SecurityUtils.currentUser().getUser().getEmployeeId();
        return leaveService.submit(id, employeeId);
    }

    @GetMapping("/requests/pending")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public List<LeaveRequestEntity> pending() {
        return leaveService.pendingForHr();
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public LeaveRequestEntity approve(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        UUID hrUserId = SecurityUtils.currentUser().getUserId();
        String note = body != null ? body.get("note") : null;
        return leaveService.decide(id, hrUserId, true, note);
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public LeaveRequestEntity reject(@PathVariable UUID id, @RequestBody(required = false) Map<String, String> body) {
        UUID hrUserId = SecurityUtils.currentUser().getUserId();
        String note = body != null ? body.get("note") : null;
        return leaveService.decide(id, hrUserId, false, note);
    }
}
