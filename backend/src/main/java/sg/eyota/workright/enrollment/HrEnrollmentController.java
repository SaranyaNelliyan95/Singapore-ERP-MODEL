package sg.eyota.workright.enrollment;

import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.employee.EmployeeService;
import sg.eyota.workright.employee.dto.EmployeeDto;
import sg.eyota.workright.employee.dto.HrEmployeeUpdateRequest;
import sg.eyota.workright.enrollment.dto.EnrollEmployeeRequest;
import sg.eyota.workright.enrollment.dto.EnrollmentResponse;
import sg.eyota.workright.enrollment.dto.InvitationStatusResponse;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/hr")
@PreAuthorize("hasAnyRole('HR','ADMIN')")
public class HrEnrollmentController {

    private final EnrollmentService enrollmentService;
    private final EmployeeService employeeService;

    public HrEnrollmentController(EnrollmentService enrollmentService, EmployeeService employeeService) {
        this.enrollmentService = enrollmentService;
        this.employeeService = employeeService;
    }

    @PostMapping({"/enrollments", "/employees"})
    public EnrollmentResponse enroll(@Valid @RequestBody EnrollEmployeeRequest request) {
        return enrollmentService.enroll(request, SecurityUtils.currentUser().getUserId());
    }

    @PutMapping("/employees/{employeeId}")
    public EmployeeDto update(
            @PathVariable UUID employeeId, @Valid @RequestBody HrEmployeeUpdateRequest request) {
        return employeeService.updateByHr(employeeId, request);
    }

    @PostMapping({
            "/enrollments/{employeeId}/resend-otp",
            "/employees/{employeeId}/resend-invitation",
            "/employees/{employeeId}/invitation"
    })
    public EnrollmentResponse resend(@PathVariable UUID employeeId) {
        return enrollmentService.resendForEmployee(employeeId, SecurityUtils.currentUser().getUserId());
    }

    @GetMapping("/employees/{employeeId}/invitation-status")
    public InvitationStatusResponse invitationStatus(@PathVariable UUID employeeId) {
        return enrollmentService.invitationStatus(employeeId);
    }
}
