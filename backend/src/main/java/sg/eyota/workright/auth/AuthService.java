package sg.eyota.workright.auth;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.admin.AdminUserService;
import sg.eyota.workright.auth.dto.AuthUserDto;
import sg.eyota.workright.auth.dto.ForgotPasswordRequest;
import sg.eyota.workright.auth.dto.LoginRequest;
import sg.eyota.workright.auth.dto.LoginResponse;
import sg.eyota.workright.auth.dto.ResetPasswordRequest;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.entity.PasswordResetTokenEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.auth.repository.PasswordResetTokenRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.config.EyotaProperties;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.mail.EmailSender;
import sg.eyota.workright.mail.MailProperties;
import sg.eyota.workright.security.JwtService;
import sg.eyota.workright.security.WorkrightUserDetails;

@Service
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AppUserRepository appUserRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final EyotaProperties properties;
    private final MailProperties mailProperties;
    private final AdminUserService adminUserService;
    private final Clock clock;

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            AppUserRepository appUserRepository,
            EmployeeRepository employeeRepository,
            PasswordResetTokenRepository resetTokenRepository,
            PasswordEncoder passwordEncoder,
            EmailSender emailSender,
            EyotaProperties properties,
            MailProperties mailProperties,
            AdminUserService adminUserService,
            Clock clock
    ) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.appUserRepository = appUserRepository;
        this.employeeRepository = employeeRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.properties = properties;
        this.mailProperties = mailProperties;
        this.adminUserService = adminUserService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        AppUserEntity existing = appUserRepository.findByEmailIgnoreCase(request.email().trim()).orElse(null);
        if (existing != null && !existing.isActive()) {
            throw inactiveAccountException();
        }
        if (existing != null && existing.getEmployeeId() != null) {
            EmployeeEntity emp = employeeRepository.findById(existing.getEmployeeId()).orElse(null);
            if (emp != null && !emp.isActive()) {
                throw inactiveAccountException();
            }
        }
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (BadCredentialsException ex) {
            throw ex;
        }
        AppUserEntity user = appUserRepository.findByEmailIgnoreCase(request.email()).orElseThrow();
        if (!user.isActive()) {
            throw inactiveAccountException();
        }
        String token = jwtService.generateToken(user);
        return new LoginResponse(token, "Bearer", jwtService.expirationMinutes(), toUserDto(user));
    }

    private ApiException inactiveAccountException() {
        String adminEmail = adminUserService.resolveAdminContactEmail();
        return new ApiException(
                HttpStatus.FORBIDDEN,
                "Account Inactive",
                "Your account is inactive. Please contact Admin (" + adminEmail + ") to activate your account.");
    }

    @Transactional(readOnly = true)
    public AuthUserDto me(WorkrightUserDetails principal) {
        return toUserDto(principal.getUser());
    }

    /**
     * Always returns a generic message to avoid email enumeration.
     */
    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        appUserRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
            if (!user.isActive()) {
                return;
            }
            resetTokenRepository.findByEmailIgnoreCaseAndUsedAtIsNull(email).forEach(prev -> {
                prev.setUsedAt(Instant.now(clock));
                resetTokenRepository.save(prev);
            });
            String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
            PasswordResetTokenEntity token = new PasswordResetTokenEntity();
            token.setUserId(user.getId());
            token.setEmail(email);
            token.setOtpHash(passwordEncoder.encode(otp));
            token.setExpiresAt(Instant.now(clock).plus(properties.enrollment().otpTtlMinutes(), ChronoUnit.MINUTES));
            resetTokenRepository.save(token);

            String body = """
                    Hello,

                    A password reset was requested for your Eyota Workright account.

                    One-time code: %s
                    This code expires in %d minutes.

                    If you did not request this, ignore this email.

                    — Eyota Workright HR
                    """.formatted(otp, properties.enrollment().otpTtlMinutes());
            emailSender.send(email, "Reset your Eyota Workright password", body);
            if (!mailProperties.enabled()) {
                org.slf4j.LoggerFactory.getLogger(AuthService.class)
                        .warn("LOCAL DEV password-reset OTP for {}: {}", email, otp);
            }
        });
        return Map.of("message", "If an account exists for that email, a reset code was sent.");
    }

    @Transactional
    public Map<String, String> resetPassword(ResetPasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Passwords do not match");
        }
        if (request.newPassword().length() < 8
                || !request.newPassword().matches(".*[A-Za-z].*")
                || !request.newPassword().matches(".*\\d.*")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Bad Request",
                    "Password must be at least 8 characters and include letters and a number");
        }
        String email = request.email().trim().toLowerCase();
        PasswordResetTokenEntity token = resetTokenRepository
                .findFirstByEmailIgnoreCaseAndUsedAtIsNullOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.BAD_REQUEST, "Bad Request", "No active password reset for this email"));

        if (Instant.now(clock).isAfter(token.getExpiresAt())) {
            token.setUsedAt(Instant.now(clock));
            resetTokenRepository.save(token);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Reset code has expired");
        }
        if (token.getAttemptCount() >= token.getMaxAttempts()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", "Too many incorrect attempts");
        }
        token.setAttemptCount(token.getAttemptCount() + 1);
        resetTokenRepository.save(token);

        if (!passwordEncoder.matches(request.otp(), token.getOtpHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid reset code");
        }

        AppUserEntity user = appUserRepository.findById(token.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "User not found"));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        appUserRepository.save(user);
        token.setUsedAt(Instant.now(clock));
        resetTokenRepository.save(token);
        return Map.of("message", "Password updated. You can sign in with your new password.");
    }

    private AuthUserDto toUserDto(AppUserEntity user) {
        String code = null;
        String name = user.getEmail();
        if (user.getEmployeeId() != null) {
            EmployeeEntity emp = employeeRepository.findById(user.getEmployeeId()).orElse(null);
            if (emp != null) {
                code = emp.getEmployeeCode();
                name = emp.getFullName();
            }
        }
        return new AuthUserDto(user.getEmail(), user.getRole(), user.getEmployeeId(), code, name);
    }
}
