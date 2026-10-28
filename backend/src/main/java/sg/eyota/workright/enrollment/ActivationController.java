package sg.eyota.workright.enrollment;

import java.util.Map;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.auth.dto.LoginResponse;
import sg.eyota.workright.enrollment.dto.ActivateAccountRequest;
import sg.eyota.workright.enrollment.dto.VerifyOtpRequest;

@RestController
@RequestMapping("/api/v1/auth/activate")
public class ActivationController {

    private final EnrollmentService enrollmentService;

    public ActivationController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @PostMapping("/verify-otp")
    public Map<String, Object> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        enrollmentService.verifyOtp(request);
        return Map.of("valid", true, "message", "OTP verified — set your new password");
    }

    @PostMapping("/complete")
    public LoginResponse complete(@Valid @RequestBody ActivateAccountRequest request) {
        return enrollmentService.activate(request);
    }
}
