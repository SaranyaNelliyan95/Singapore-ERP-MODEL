package sg.eyota.workright.enrollment;

import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.enrollment.dto.EnrollEmployeeRequest;
import sg.eyota.workright.enrollment.dto.EnrollmentResponse;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/hr/enrollments")
@PreAuthorize("hasAnyRole('HR','ADMIN')")
public class HrEnrollmentController {

    private final EnrollmentService enrollmentService;

    public HrEnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @PostMapping
    public EnrollmentResponse enroll(@Valid @RequestBody EnrollEmployeeRequest request) {
        UUID hrUserId = SecurityUtils.currentUser().getUserId();
        return enrollmentService.enroll(request, hrUserId);
    }

    @PostMapping("/{employeeId}/resend-otp")
    public EnrollmentResponse resend(@PathVariable UUID employeeId) {
        UUID hrUserId = SecurityUtils.currentUser().getUserId();
        return enrollmentService.resendOtp(employeeId, hrUserId);
    }
}
