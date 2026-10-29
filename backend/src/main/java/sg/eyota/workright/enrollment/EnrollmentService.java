package sg.eyota.workright.enrollment;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.auth.dto.AuthUserDto;
import sg.eyota.workright.auth.dto.LoginResponse;
import sg.eyota.workright.auth.entity.AppUserEntity;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.common.model.UserRole;
import sg.eyota.workright.config.EyotaProperties;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.enrollment.dto.ActivateAccountRequest;
import sg.eyota.workright.enrollment.dto.EnrollEmployeeRequest;
import sg.eyota.workright.enrollment.dto.EnrollmentResponse;
import sg.eyota.workright.enrollment.dto.VerifyOtpRequest;
import sg.eyota.workright.enrollment.entity.EmployeeInvitationEntity;
import sg.eyota.workright.enrollment.repository.EmployeeInvitationRepository;
import sg.eyota.workright.mail.EmailSender;
import sg.eyota.workright.security.JwtService;

@Service
public class EnrollmentService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final EmployeeInvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final JwtService jwtService;
    private final EyotaProperties properties;
    private final Clock clock;

    public EnrollmentService(
            EmployeeRepository employeeRepository,
            AppUserRepository appUserRepository,
            EmployeeInvitationRepository invitationRepository,
            PasswordEncoder passwordEncoder,
            EmailSender emailSender,
            JwtService jwtService,
            EyotaProperties properties,
            Clock clock
    ) {
        this.employeeRepository = employeeRepository;
        this.appUserRepository = appUserRepository;
        this.invitationRepository = invitationRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.jwtService = jwtService;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public EnrollmentResponse enroll(EnrollEmployeeRequest request, UUID hrUserId) {
        String email = request.workEmail().trim().toLowerCase();
        String code = request.employeeCode().trim();

        employeeRepository.findByEmployeeCode(code).ifPresent(e -> {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict", "Employee code already exists");
        });
        if (appUserRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict", "A login already exists for this email");
        }

        EmployeeEntity employee = new EmployeeEntity();
        employee.setEmployeeCode(code);
        employee.setFullName(request.fullName().trim());
        employee.setDepartment(request.department());
        employee.setDesignation(request.designation());
        employee.setEmploymentType(
                request.employmentType() != null ? request.employmentType() : EmployeeEntity.EmploymentType.FULL_TIME);
        employee.setEmploymentStatus(
                request.employmentStatus() != null
                        ? request.employmentStatus()
                        : EmployeeEntity.EmploymentStatus.PROBATION);
        employee.setWorkLocationMode(
                request.workLocationMode() != null
                        ? request.workLocationMode()
                        : EmployeeEntity.WorkLocationMode.OFFICE);
        employee.setWorkplaceId(request.workplaceId());
        employee.setManagerEmployeeId(request.managerEmployeeId());
        employee.setDateOfJoining(request.dateOfJoining());
        employee.setMobile(request.mobile());
        employee.setPersonalEmail(email);
        employee.setActive(true);
        employee = employeeRepository.save(employee);

        AppUserEntity user = new AppUserEntity();
        user.setEmail(email);
        // Unusable until activation — random hash; account locked (active=false)
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole(UserRole.EMPLOYEE);
        user.setActive(false);
        user.setEmployeeId(employee.getId());
        user = appUserRepository.save(user);

        String otp = generateOtp();
        EmployeeInvitationEntity invitation = createInvitation(employee.getId(), user.getId(), email, otp, hrUserId);
        sendInviteEmail(employee.getFullName(), email, otp);

        return toResponse(invitation, employee, otp);
    }

    @Transactional
    public EnrollmentResponse resendOtp(UUID employeeId, UUID hrUserId) {
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
        AppUserEntity user = appUserRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "No login linked to employee"));

        if (user.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Employee account is already activated");
        }

        invitationRepository.findFirstByEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
                        user.getEmail(), EmployeeInvitationEntity.Status.PENDING)
                .ifPresent(prev -> {
                    prev.setStatus(EmployeeInvitationEntity.Status.REVOKED);
                    invitationRepository.save(prev);
                });

        String otp = generateOtp();
        EmployeeInvitationEntity invitation =
                createInvitation(employee.getId(), user.getId(), user.getEmail(), otp, hrUserId);
        sendInviteEmail(employee.getFullName(), user.getEmail(), otp);
        return toResponse(invitation, employee, otp);
    }

    @Transactional(readOnly = true)
    public void verifyOtp(VerifyOtpRequest request) {
        requireValidPendingInvitation(request.email(), request.otp());
    }

    @Transactional
    public LoginResponse activate(ActivateAccountRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Passwords do not match");
        }
        if (request.newPassword().length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Password must be at least 8 characters");
        }

        EmployeeInvitationEntity invitation = requireValidPendingInvitation(request.email(), request.otp());
        AppUserEntity user = appUserRepository.findById(invitation.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "User not found"));

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setActive(true);
        appUserRepository.save(user);

        invitation.setStatus(EmployeeInvitationEntity.Status.ACTIVATED);
        invitation.setActivatedAt(Instant.now(clock));
        invitationRepository.save(invitation);

        String token = jwtService.generateToken(user);
        EmployeeEntity emp = employeeRepository.findById(user.getEmployeeId()).orElse(null);
        AuthUserDto dto = new AuthUserDto(
                user.getEmail(),
                user.getRole(),
                user.getEmployeeId(),
                emp != null ? emp.getEmployeeCode() : null,
                emp != null ? emp.getFullName() : user.getEmail());
        return new LoginResponse(token, "Bearer", jwtService.expirationMinutes(), dto);
    }

    private EmployeeInvitationEntity requireValidPendingInvitation(String rawEmail, String otp) {
        String email = rawEmail.trim().toLowerCase();
        EmployeeInvitationEntity invitation = invitationRepository
                .findFirstByEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
                        email, EmployeeInvitationEntity.Status.PENDING)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.BAD_REQUEST, "Bad Request", "No pending invitation for this email"));

        if (Instant.now(clock).isAfter(invitation.getExpiresAt())) {
            invitation.setStatus(EmployeeInvitationEntity.Status.EXPIRED);
            invitationRepository.save(invitation);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "OTP has expired — ask HR to resend");
        }
        if (invitation.getAttemptCount() >= invitation.getMaxAttempts()) {
            invitation.setStatus(EmployeeInvitationEntity.Status.REVOKED);
            invitationRepository.save(invitation);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Too many OTP attempts — ask HR to resend");
        }

        invitation.setAttemptCount(invitation.getAttemptCount() + 1);
        invitationRepository.save(invitation);

        if (!passwordEncoder.matches(otp, invitation.getOtpHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid OTP");
        }
        // Successful verify should not burn remaining attempts excessively — reset counter lightly
        invitation.setAttemptCount(Math.max(0, invitation.getAttemptCount() - 1));
        invitationRepository.save(invitation);
        return invitation;
    }

    private EmployeeInvitationEntity createInvitation(
            UUID employeeId, UUID userId, String email, String otp, UUID hrUserId
    ) {
        int ttl = Math.max(5, properties.enrollment().otpTtlMinutes());
        EmployeeInvitationEntity invitation = new EmployeeInvitationEntity();
        invitation.setEmployeeId(employeeId);
        invitation.setUserId(userId);
        invitation.setEmail(email);
        invitation.setOtpHash(passwordEncoder.encode(otp));
        invitation.setStatus(EmployeeInvitationEntity.Status.PENDING);
        invitation.setExpiresAt(Instant.now(clock).plus(ttl, ChronoUnit.MINUTES));
        invitation.setAttemptCount(0);
        invitation.setMaxAttempts(5);
        invitation.setLastSentAt(Instant.now(clock));
        invitation.setCreatedByUserId(hrUserId);
        return invitationRepository.save(invitation);
    }

    private void sendInviteEmail(String fullName, String email, String otp) {
        int ttl = properties.enrollment().otpTtlMinutes();
        String activateUrl = properties.enrollment().activateBaseUrl();
        String body = """
                Hello %s,

                HR has enrolled you in Eyota Workright HR.

                Your one-time activation code (OTP): %s
                This code expires in %d minutes.

                Open the activation page and set your new password:
                %s

                If you did not expect this email, contact your HR team.

                — Eyota Workright
                """.formatted(fullName, otp, ttl, activateUrl);
        emailSender.send(email, "Activate your Eyota Workright account", body);
    }

    private EnrollmentResponse toResponse(EmployeeInvitationEntity invitation, EmployeeEntity employee, String otp) {
        boolean expose = properties.enrollment().exposeOtpInApi();
        return new EnrollmentResponse(
                invitation.getId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                invitation.getEmail(),
                invitation.getStatus().name(),
                invitation.getExpiresAt(),
                expose ? otp : null,
                "Invitation sent. Employee must activate with OTP and set a new password before login."
        );
    }

    private static String generateOtp() {
        int n = RANDOM.nextInt(1_000_000);
        return String.format("%06d", n);
    }
}
