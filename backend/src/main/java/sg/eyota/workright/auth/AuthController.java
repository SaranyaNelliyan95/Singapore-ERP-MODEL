package sg.eyota.workright.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

import sg.eyota.workright.auth.dto.AuthUserDto;
import sg.eyota.workright.auth.dto.ForgotPasswordRequest;
import sg.eyota.workright.auth.dto.LoginRequest;
import sg.eyota.workright.auth.dto.LoginResponse;
import sg.eyota.workright.auth.dto.ResetPasswordRequest;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout() {
        // Stateless JWT — client discards token
    }

    @GetMapping("/me")
    public AuthUserDto me() {
        return authService.me(SecurityUtils.currentUser());
    }
}
