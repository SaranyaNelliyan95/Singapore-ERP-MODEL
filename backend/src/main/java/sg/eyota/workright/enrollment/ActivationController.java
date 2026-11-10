package sg.eyota.workright.enrollment;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.auth.dto.LoginResponse;
import sg.eyota.workright.enrollment.dto.ActivateAccountRequest;
import sg.eyota.workright.enrollment.dto.CompleteActivationRequest;
import sg.eyota.workright.enrollment.dto.EnrollmentResponse;
import sg.eyota.workright.enrollment.dto.ResendOtpRequest;
import sg.eyota.workright.enrollment.dto.SendActivationOtpRequest;
import sg.eyota.workright.enrollment.dto.SendActivationOtpResponse;
import sg.eyota.workright.enrollment.dto.ValidateInvitationRequest;
import sg.eyota.workright.enrollment.dto.ValidateInvitationResponse;
import sg.eyota.workright.enrollment.dto.VerifyActivationOtpRequest;
import sg.eyota.workright.enrollment.dto.VerifyOtpRequest;
import sg.eyota.workright.enrollment.dto.VerifyOtpResponse;

@RestController
@RequestMapping("/api/v1/auth")
public class ActivationController {

    private final EnrollmentService enrollmentService;

    public ActivationController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @PostMapping("/employee-activation/validate-invitation")
    public ValidateInvitationResponse validateInvitation(@Valid @RequestBody ValidateInvitationRequest request) {
        return enrollmentService.validateInvitation(request);
    }

    @PostMapping("/employee-activation/send-otp")
    public SendActivationOtpResponse sendOtp(@Valid @RequestBody SendActivationOtpRequest request) {
        return enrollmentService.sendActivationOtp(request);
    }

    @PostMapping("/employee-activation/verify-otp")
    public VerifyOtpResponse verifyActivationOtp(@Valid @RequestBody VerifyActivationOtpRequest request) {
        return enrollmentService.verifyOtpWithInvitationToken(request.token(), request.otp());
    }

    @PostMapping({"/employee-activation/create-password", "/activate/complete", "/complete-registration"})
    public LoginResponse createPassword(@Valid @RequestBody ActivateAccountRequest request) {
        return enrollmentService.activate(request);
    }

    /** Combined OTP + password in one call (step-by-step endpoints remain available). */
    @PostMapping("/employee-activation/complete")
    public LoginResponse completeCombined(@Valid @RequestBody CompleteActivationRequest request) {
        return enrollmentService.verifyOtpAndActivate(
                request.token(), request.otp(), request.newPassword(), request.confirmPassword());
    }

    /** Legacy: email + OTP (prefer token-based employee-activation APIs). */
    @PostMapping("/activate/verify-otp")
    public VerifyOtpResponse verifyOtpLegacy(@Valid @RequestBody VerifyOtpRequest request) {
        return enrollmentService.verifyOtp(request);
    }

    @PostMapping("/resend-otp")
    public EnrollmentResponse resendInvitationByEmail(@Valid @RequestBody ResendOtpRequest request) {
        return enrollmentService.resendByEmail(request);
    }
}
