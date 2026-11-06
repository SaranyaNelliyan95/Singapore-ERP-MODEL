package sg.eyota.workright.enrollment;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import sg.eyota.workright.employee.EmployeeCodeGenerator;
import sg.eyota.workright.employee.EmployeeHireRules;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.enrollment.dto.ActivateAccountRequest;
import sg.eyota.workright.enrollment.dto.EnrollEmployeeRequest;
import sg.eyota.workright.enrollment.dto.EnrollmentResponse;
import sg.eyota.workright.enrollment.dto.InvitationStatusResponse;
import sg.eyota.workright.enrollment.dto.ResendOtpRequest;
import sg.eyota.workright.enrollment.dto.SendActivationOtpRequest;
import sg.eyota.workright.enrollment.dto.SendActivationOtpResponse;
import sg.eyota.workright.enrollment.dto.ValidateInvitationRequest;
import sg.eyota.workright.enrollment.dto.ValidateInvitationResponse;
import sg.eyota.workright.enrollment.dto.VerifyOtpRequest;
import sg.eyota.workright.enrollment.dto.VerifyOtpResponse;
import sg.eyota.workright.enrollment.entity.AccountActivationTokenEntity;
import sg.eyota.workright.enrollment.entity.EmployeeInvitationEntity;
import sg.eyota.workright.enrollment.repository.AccountActivationTokenRepository;
import sg.eyota.workright.enrollment.repository.EmployeeInvitationRepository;
import sg.eyota.workright.mail.EmailSender;
import sg.eyota.workright.mail.MailProperties;
import sg.eyota.workright.security.JwtService;

@Service
public class EnrollmentService {

    private static final Logger log = LoggerFactory.getLogger(EnrollmentService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final EmployeeInvitationRepository invitationRepository;
    private final AccountActivationTokenRepository activationTokenRepository;
    private final EmployeeCodeGenerator codeGenerator;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;
    private final JwtService jwtService;
    private final EyotaProperties properties;
    private final MailProperties mailProperties;
    private final Clock clock;

    public EnrollmentService(
            EmployeeRepository employeeRepository,
            AppUserRepository appUserRepository,
            EmployeeInvitationRepository invitationRepository,
            AccountActivationTokenRepository activationTokenRepository,
            EmployeeCodeGenerator codeGenerator,
            PasswordEncoder passwordEncoder,
            EmailSender emailSender,
            JwtService jwtService,
            EyotaProperties properties,
            MailProperties mailProperties,
            Clock clock
    ) {
        this.employeeRepository = employeeRepository;
        this.appUserRepository = appUserRepository;
        this.invitationRepository = invitationRepository;
        this.activationTokenRepository = activationTokenRepository;
        this.codeGenerator = codeGenerator;
        this.passwordEncoder = passwordEncoder;
        this.emailSender = emailSender;
        this.jwtService = jwtService;
        this.properties = properties;
        this.mailProperties = mailProperties;
        this.clock = clock;
    }

    @Transactional
    public EnrollmentResponse enroll(EnrollEmployeeRequest request, UUID hrUserId) {
        String email = EmployeeHireRules.normalizeEmail(request.email());
        String fullName = EmployeeHireRules.requireName(request.fullName());
        EmployeeHireRules.requireMobile(request.mobile());
        String fin = EmployeeHireRules.requireFin(request.finNumber());
        String gender = EmployeeHireRules.normalizeGender(request.gender());
        String paymentMode = EmployeeHireRules.normalizePaymentMode(request.paymentMode());
        String salaryPeriod = EmployeeHireRules.normalizeSalaryPeriod(request.salaryPeriod());
        EmployeeHireRules.validateBanking(paymentMode, request.bankName(), request.bankAccountNumber());
        EmployeeHireRules.requireBasicPay(request.basicPay());
        EmployeeHireRules.optionalNonNegative("Overtime rate", request.overtimeRate());
        EmployeeHireRules.optionalNonNegative("Allowances", request.allowancesTotal());
        if (request.nationality() == null || request.nationality().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Nationality is required");
        }
        if (request.residentialAddress() == null || request.residentialAddress().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Residential address is required");
        }
        if (request.dateOfBirth() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Date of birth is required");
        }
        if (request.employmentType() == EmployeeEntity.EmploymentType.INTERN) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Bad Request",
                    "Employment type must be Full-time, Part-time, Contract, or Temporary");
        }

        if (appUserRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict", "A login already exists for this email");
        }
        if (employeeRepository.findByPersonalEmailIgnoreCase(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict", "An employee already uses this email");
        }

        String code = codeGenerator.nextCode();
        EmployeeEntity employee = new EmployeeEntity();
        employee.setEmployeeCode(code);
        employee.setFullName(fullName);
        employee.setPersonalEmail(email);
        employee.setMobile(request.mobile().trim());
        employee.setDesignation(request.designation().trim());
        employee.setDepartment(request.department());
        employee.setEmploymentType(request.employmentType());
        employee.setEmploymentStatus(
                request.employmentStatus() != null
                        ? request.employmentStatus()
                        : EmployeeEntity.EmploymentStatus.PENDING);
        employee.setDateOfJoining(request.dateOfJoining());
        employee.setDateOfBirth(request.dateOfBirth());
        employee.setGender(gender);
        employee.setNationality(request.nationality().trim());
        employee.setResidentialAddress(request.residentialAddress().trim());
        employee.setAlternativeContact(request.alternativeContact());
        employee.setWorkPassType(request.workPassType());
        employee.setWorkPassNumber(request.workPassNumber());
        employee.setWorkPassExpiry(request.workPassExpiry());
        employee.setFinNumber(fin);
        employee.setPassportNumber(request.passportNumber());
        employee.setPassportExpiry(request.passportExpiry());
        employee.setPaymentMode(paymentMode);
        employee.setBankName("IN_HAND".equals(paymentMode) ? null : request.bankName());
        if ("BANKING".equals(paymentMode) && request.bankAccountNumber() != null) {
            employee.setBankAccountNumberMasked(maskAccount(request.bankAccountNumber()));
            employee.setBankAccountMasked(maskAccount(request.bankAccountNumber()));
        }
        employee.setBasicPay(request.basicPay());
        employee.setOvertimeRate(request.overtimeRate());
        employee.setSalaryPeriod(salaryPeriod);
        employee.setAllowancesTotal(
                request.allowancesTotal() != null ? request.allowancesTotal() : BigDecimal.ZERO);
        employee.setPayrollStartDate(request.payrollStartDate());
        employee.setProbationEnd(request.probationEnd());
        employee.setManagerEmployeeId(request.managerEmployeeId());
        employee.setCreatedByUserId(hrUserId);
        employee.setActive(true);
        employee.setInvitationEmailStatus("SENDING");
        employee = employeeRepository.save(employee);

        AppUserEntity user = new AppUserEntity();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole(UserRole.EMPLOYEE);
        user.setActive(false);
        user.setEmployeeId(employee.getId());
        user = appUserRepository.save(user);

        String rawInviteToken = generateSecureToken();
        EmployeeInvitationEntity invitation =
                createInvitationRecord(employee.getId(), user.getId(), email, rawInviteToken, hrUserId);

        try {
            sendInvitationEmailDelivered(employee.getFullName(), email, rawInviteToken);
            invitation.setEmailDeliveryStatus("SENT");
            employee.setInvitationEmailStatus("SENT");
        } catch (ApiException ex) {
            invitation.setEmailDeliveryStatus("FAILED");
            invitation.setEmailError(ex.getMessage());
            employee.setInvitationEmailStatus("FAILED");
            invitationRepository.save(invitation);
            employeeRepository.save(employee);
            // Employee is kept — HR can resend from directory
            return toResponse(
                    invitation,
                    employee,
                    "Employee created successfully, but the invitation email could not be sent. "
                            + "Use Send / Resend invitation in Employee Management after SMTP is configured.");
        }
        invitationRepository.save(invitation);
        employeeRepository.save(employee);

        return toResponse(
                invitation,
                employee,
                "Employee saved. Invitation email accepted by SMTP. "
                        + "Employee must open Verify, request OTP, then set a password.");
    }

    @Transactional
    public EnrollmentResponse resendForEmployee(UUID employeeId, UUID hrUserId) {
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
        AppUserEntity user = appUserRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "No login linked"));
        if (user.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Account is already activated");
        }
        return issueFreshInvitation(employee, user, hrUserId);
    }

    @Transactional(readOnly = true)
    public InvitationStatusResponse invitationStatus(UUID employeeId) {
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
        AppUserEntity user = appUserRepository.findByEmployeeId(employeeId).orElse(null);
        EmployeeInvitationEntity latest = invitationRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId)
                .stream().findFirst().orElse(null);
        String accountStatus = user != null && user.isActive() ? "ACTIVE" : "INVITATION_PENDING";
        String inviteStatus = mapInvitationLabel(employee, user, latest);
        return new InvitationStatusResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getPersonalEmail(),
                employee.getEmploymentStatus().name(),
                inviteStatus,
                accountStatus,
                employee.getInvitationEmailStatus(),
                latest != null ? latest.getInvitationExpiresAt() : null,
                latest != null ? latest.getLastSentAt() : null,
                user != null && user.isActive()
                        ? "Account activated"
                        : "Invitation " + inviteStatus.toLowerCase().replace('_', ' '));
    }

    @Transactional
    public ValidateInvitationResponse validateInvitation(ValidateInvitationRequest request) {
        EmployeeInvitationEntity invitation = requireValidInvitationToken(request.token());
        EmployeeEntity employee = employeeRepository.findById(invitation.getEmployeeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
        return new ValidateInvitationResponse(
                true,
                maskEmail(invitation.getEmail()),
                employee.getFullName(),
                employee.getEmployeeCode(),
                "Invitation is valid. Click Send OTP to receive a verification code.");
    }

    @Transactional
    public SendActivationOtpResponse sendActivationOtp(SendActivationOtpRequest request) {
        EmployeeInvitationEntity invitation = requireValidInvitationToken(request.token());
        Instant now = Instant.now(clock);
        if (invitation.getOtpLastSentAt() != null) {
            long cooldown = properties.enrollment().otpResendCooldownSeconds();
            Instant earliest = invitation.getOtpLastSentAt().plus(cooldown, ChronoUnit.SECONDS);
            if (now.isBefore(earliest)) {
                throw new ApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Too Many Requests",
                        "Please wait before requesting another OTP");
            }
        }

        String otp = generateOtp();
        invitation.setOtpHash(passwordEncoder.encode(otp));
        invitation.setOtpExpiresAt(now.plus(properties.enrollment().otpTtlSeconds(), ChronoUnit.SECONDS));
        invitation.setExpiresAt(invitation.getOtpExpiresAt());
        invitation.setOtpUsedAt(null);
        invitation.setAttemptCount(0);
        invitation.setMaxAttempts(properties.enrollment().otpMaxAttempts());
        invitation.setOtpLastSentAt(now);
        invitationRepository.save(invitation);

        try {
            sendOtpEmail(invitation.getEmail(), otp);
        } catch (ApiException ex) {
            throw ex;
        }

        if (!mailProperties.enabled()) {
            log.warn("LOCAL DEV OTP for {} (MAIL_ENABLED=false): {}", invitation.getEmail(), otp);
        }

        return new SendActivationOtpResponse(
                true,
                maskEmail(invitation.getEmail()),
                invitation.getOtpExpiresAt(),
                properties.enrollment().otpResendCooldownSeconds(),
                "OTP sent to your registered email. It expires in 2 minutes.",
                properties.enrollment().exposeOtpInApi() ? otp : null);
    }

    /** Legacy email+OTP verify (kept for older clients). Prefer token+OTP path. */
    @Transactional
    public VerifyOtpResponse verifyOtp(VerifyOtpRequest request) {
        EmployeeInvitationEntity invitation = requireValidPendingOtpByEmail(request.email(), request.otp());
        return issueActivationAuthorization(invitation);
    }

    @Transactional
    public VerifyOtpResponse verifyOtpWithInvitationToken(String invitationToken, String otp) {
        EmployeeInvitationEntity invitation = requireValidInvitationToken(invitationToken);
        validateOtpAgainstInvitation(invitation, otp);
        return issueActivationAuthorization(invitation);
    }

    @Transactional
    public LoginResponse activate(ActivateAccountRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Passwords do not match");
        }
        validatePasswordPolicy(request.newPassword());

        AccountActivationTokenEntity token = findValidActivationToken(request.activationToken());
        AppUserEntity user = appUserRepository.findById(token.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "User not found"));
        if (user.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Account is already activated");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setActive(true);
        appUserRepository.save(user);

        invitationRepository.findById(token.getInvitationId()).ifPresent(inv -> {
            inv.setStatus(EmployeeInvitationEntity.Status.ACTIVATED);
            inv.setActivatedAt(Instant.now(clock));
            invitationRepository.save(inv);
        });

        token.setUsedAt(Instant.now(clock));
        activationTokenRepository.save(token);

        EmployeeEntity emp = employeeRepository.findById(user.getEmployeeId()).orElse(null);
        if (emp != null) {
            emp.setInvitationEmailStatus("ACCEPTED");
            employeeRepository.save(emp);
        }

        String tokenJwt = jwtService.generateToken(user);
        AuthUserDto dto = new AuthUserDto(
                user.getEmail(),
                user.getRole(),
                user.getEmployeeId(),
                emp != null ? emp.getEmployeeCode() : null,
                emp != null ? emp.getFullName() : user.getEmail());
        return new LoginResponse(tokenJwt, "Bearer", jwtService.expirationMinutes(), dto);
    }

    /** Public resend-otp by email — re-sends invitation email (not OTP). */
    @Transactional
    public EnrollmentResponse resendByEmail(ResendOtpRequest request) {
        String email = request.email().trim().toLowerCase();
        AppUserEntity user = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "No invitation for this email"));
        if (user.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Account is already activated");
        }
        EmployeeEntity employee = employeeRepository.findById(user.getEmployeeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
        return issueFreshInvitation(employee, user, null);
    }

    private EnrollmentResponse issueFreshInvitation(EmployeeEntity employee, AppUserEntity user, UUID hrUserId) {
        invitationRepository.findByEmployeeIdOrderByCreatedAtDesc(employee.getId()).stream()
                .filter(i -> i.getStatus() == EmployeeInvitationEntity.Status.PENDING)
                .forEach(prev -> {
                    prev.setStatus(EmployeeInvitationEntity.Status.REVOKED);
                    invitationRepository.save(prev);
                });

        employee.setInvitationEmailStatus("SENDING");
        employeeRepository.save(employee);

        String rawToken = generateSecureToken();
        EmployeeInvitationEntity invitation =
                createInvitationRecord(employee.getId(), user.getId(), user.getEmail(), rawToken, hrUserId);
        try {
            sendInvitationEmailDelivered(employee.getFullName(), user.getEmail(), rawToken);
            invitation.setEmailDeliveryStatus("SENT");
            employee.setInvitationEmailStatus("SENT");
        } catch (ApiException ex) {
            invitation.setEmailDeliveryStatus("FAILED");
            invitation.setEmailError(ex.getMessage());
            employee.setInvitationEmailStatus("FAILED");
            invitationRepository.save(invitation);
            employeeRepository.save(employee);
            return toResponse(
                    invitation,
                    employee,
                    "Invitation could not be emailed: " + ex.getMessage());
        }
        invitationRepository.save(invitation);
        employeeRepository.save(employee);
        return toResponse(invitation, employee, "Invitation resent. Previous unused invitations were invalidated.");
    }

    private VerifyOtpResponse issueActivationAuthorization(EmployeeInvitationEntity invitation) {
        invitation.setOtpUsedAt(Instant.now(clock));
        invitationRepository.save(invitation);

        byte[] tokenBytes = new byte[24];
        RANDOM.nextBytes(tokenBytes);
        String rawToken = HexFormat.of().formatHex(tokenBytes);
        AccountActivationTokenEntity token = new AccountActivationTokenEntity();
        token.setUserId(invitation.getUserId());
        token.setInvitationId(invitation.getId());
        token.setTokenHash(passwordEncoder.encode(rawToken));
        token.setExpiresAt(Instant.now(clock).plus(15, ChronoUnit.MINUTES));
        token.setCreatedAt(Instant.now(clock));
        activationTokenRepository.save(token);

        return new VerifyOtpResponse(true, rawToken, "OTP verified. Set your password within 15 minutes.");
    }

    private EmployeeInvitationEntity createInvitationRecord(
            UUID employeeId, UUID userId, String email, String rawInviteToken, UUID hrUserId
    ) {
        Instant now = Instant.now(clock);
        Instant inviteExpiry = now.plus(properties.enrollment().invitationTtlHours(), ChronoUnit.HOURS);
        EmployeeInvitationEntity invitation = new EmployeeInvitationEntity();
        invitation.setEmployeeId(employeeId);
        invitation.setUserId(userId);
        invitation.setEmail(email);
        invitation.setInvitationTokenHash(passwordEncoder.encode(rawInviteToken));
        invitation.setInvitationExpiresAt(inviteExpiry);
        invitation.setExpiresAt(inviteExpiry);
        invitation.setOtpHash(null);
        invitation.setStatus(EmployeeInvitationEntity.Status.PENDING);
        invitation.setAttemptCount(0);
        invitation.setMaxAttempts(properties.enrollment().otpMaxAttempts());
        invitation.setLastSentAt(now);
        invitation.setCreatedByUserId(hrUserId);
        invitation.setEmailDeliveryStatus("PENDING");
        return invitationRepository.save(invitation);
    }

    private EmployeeInvitationEntity requireValidInvitationToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Invitation token is required");
        }
        List<EmployeeInvitationEntity> pending = invitationRepository.findAll().stream()
                .filter(i -> i.getStatus() == EmployeeInvitationEntity.Status.PENDING)
                .filter(i -> i.getInvitationTokenHash() != null)
                .toList();
        for (EmployeeInvitationEntity inv : pending) {
            if (passwordEncoder.matches(rawToken, inv.getInvitationTokenHash())) {
                Instant expiry = inv.getInvitationExpiresAt() != null ? inv.getInvitationExpiresAt() : inv.getExpiresAt();
                if (Instant.now(clock).isAfter(expiry)) {
                    inv.setStatus(EmployeeInvitationEntity.Status.EXPIRED);
                    invitationRepository.save(inv);
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Invitation link has expired");
                }
                AppUserEntity user = appUserRepository.findById(inv.getUserId()).orElse(null);
                if (user != null && user.isActive()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Account is already activated");
                }
                return inv;
            }
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid or expired invitation link");
    }

    private void validateOtpAgainstInvitation(EmployeeInvitationEntity invitation, String otp) {
        if (invitation.getOtpHash() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Request an OTP first");
        }
        if (invitation.getOtpUsedAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "OTP already used — request a new OTP");
        }
        Instant otpExpiry = invitation.getOtpExpiresAt() != null ? invitation.getOtpExpiresAt() : invitation.getExpiresAt();
        if (Instant.now(clock).isAfter(otpExpiry)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Bad Request",
                    "Your verification code has expired. Please request a new OTP.");
        }
        if (invitation.getAttemptCount() >= invitation.getMaxAttempts()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests", "Too many incorrect OTP attempts");
        }
        invitation.setAttemptCount(invitation.getAttemptCount() + 1);
        invitationRepository.save(invitation);
        if (!passwordEncoder.matches(otp, invitation.getOtpHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid OTP");
        }
    }

    private EmployeeInvitationEntity requireValidPendingOtpByEmail(String rawEmail, String otp) {
        String email = rawEmail.trim().toLowerCase();
        EmployeeInvitationEntity invitation = invitationRepository
                .findFirstByEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
                        email, EmployeeInvitationEntity.Status.PENDING)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.BAD_REQUEST, "Bad Request", "No pending invitation for this email"));
        validateOtpAgainstInvitation(invitation, otp);
        return invitation;
    }

    private AccountActivationTokenEntity findValidActivationToken(String rawToken) {
        List<AccountActivationTokenEntity> candidates = activationTokenRepository.findAll().stream()
                .filter(t -> t.getUsedAt() == null)
                .filter(t -> Instant.now(clock).isBefore(t.getExpiresAt()))
                .toList();
        for (AccountActivationTokenEntity t : candidates) {
            if (passwordEncoder.matches(rawToken, t.getTokenHash())) {
                return t;
            }
        }
        throw new ApiException(
                HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid or expired activation token — verify OTP again");
    }

    /**
     * Sends invitation mail and fails when SMTP is off or delivery fails,
     * so HR sees Invitation = Failed and can Resend after configuring mail.
     */
    private void sendInvitationEmailDelivered(String fullName, String email, String rawToken) {
        sendInvitationEmail(fullName, email, rawToken);
        if (!mailProperties.enabled()) {
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "Email Delivery Failed",
                    "MAIL_ENABLED=false — invitation was logged on the server only, not delivered. "
                            + "Set MAIL_ENABLED=true with SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD, then use Resend invitation.");
        }
    }

    private void sendInvitationEmail(String fullName, String email, String rawToken) {
        String base = properties.enrollment().activateBaseUrl();
        String link = base.contains("?") ? base + "&token=" + rawToken : base + "?token=" + rawToken;
        String subject = "Congratulations — You have been enrolled at Eyota Pvt. Ltd.";
        String plain = """
                Dear %s,

                Congratulations!

                You have been enrolled as an employee of Eyota Pvt. Ltd.

                Please verify your account to continue: open the Verify link below, request an OTP to your email, then create your password.

                Registered email: %s

                Verify here: %s

                For security reasons, this invitation link is valid for a limited period. If the link expires, please contact your HR team and request a new invitation.

                If you were not expecting this invitation, please contact your HR team.

                Regards,
                HR Team
                Eyota Pvt. Ltd.
                """.formatted(fullName, email, link);

        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#243447;line-height:1.5">
                  <h2 style="color:#2f5d7c">Congratulations — Eyota Pvt. Ltd.</h2>
                  <p>Dear %s,</p>
                  <p><strong>Congratulations!</strong> You have been enrolled as an employee of Eyota Pvt. Ltd.</p>
                  <p>Click <strong>Verify</strong> to open the activation page. You will be asked to send an OTP to this email, enter the code (valid for 2 minutes), then create your password and log in.</p>
                  <p>Registered email: <strong>%s</strong></p>
                  <p style="margin:28px 0">
                    <a href="%s" style="background:#2f5d7c;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">Verify</a>
                  </p>
                  <p style="font-size:13px;color:#5b6b7c">For security reasons, this invitation link is valid for a limited period. If the link expires, please contact your HR team and request a new invitation.</p>
                  <p style="font-size:13px;color:#5b6b7c">If you were not expecting this invitation, please contact your HR team.</p>
                  <p>Regards,<br/>HR Team<br/>Eyota Pvt. Ltd.</p>
                </div>
                """.formatted(escapeHtml(fullName), escapeHtml(email), link);
        emailSender.sendHtml(email, subject, plain, html);
    }

    private void sendOtpEmail(String email, String otp) {
        int seconds = properties.enrollment().otpTtlSeconds();
        String subject = "Your Eyota employee verification code";
        String plain = """
                Your Eyota Workright verification code is: %s

                This code expires in %d seconds (2 minutes) and can be used once.

                If you did not request this, contact HR.
                """.formatted(otp, seconds);
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;color:#243447">
                  <p>Your Eyota Workright verification code is:</p>
                  <p style="font-size:28px;letter-spacing:6px;font-weight:700">******</p>
                  <p style="font-size:13px;color:#5b6b7c">Enter the code from your email client. It expires in 2 minutes and can be used once.</p>
                </div>
                """.formatted();
        // HTML intentionally does not embed OTP digits (clients that render HTML only still get plain part).
        // MimeMessageHelper setText(plain, html) — plain carries the OTP for inbox readability.
        emailSender.sendHtml(email, subject, plain, html.replace("******", otp));
    }

    private EnrollmentResponse toResponse(
            EmployeeInvitationEntity invitation, EmployeeEntity employee, String message
    ) {
        AppUserEntity user = appUserRepository.findById(invitation.getUserId()).orElse(null);
        String accountStatus = user != null && user.isActive() ? "ACTIVE" : "INVITATION_PENDING";
        return new EnrollmentResponse(
                invitation.getId(),
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getFullName(),
                invitation.getEmail(),
                employee.getEmploymentStatus().name(),
                accountStatus,
                employee.getInvitationEmailStatus(),
                invitation.getInvitationExpiresAt() != null
                        ? invitation.getInvitationExpiresAt()
                        : invitation.getExpiresAt(),
                null,
                message
        );
    }

    private static String mapInvitationLabel(
            EmployeeEntity employee, AppUserEntity user, EmployeeInvitationEntity latest
    ) {
        if (user != null && user.isActive()) {
            return "ACCEPTED";
        }
        String delivery = employee.getInvitationEmailStatus();
        if (delivery == null || delivery.isBlank() || "NOT_SENT".equals(delivery) || "PENDING".equals(delivery)) {
            return "NOT_SENT";
        }
        if ("SENDING".equals(delivery)) {
            return "SENDING";
        }
        if ("FAILED".equals(delivery)) {
            return "FAILED";
        }
        if ("ACCEPTED".equals(delivery)) {
            return "ACCEPTED";
        }
        if (latest != null && latest.getStatus() == EmployeeInvitationEntity.Status.EXPIRED) {
            return "EXPIRED";
        }
        if ("SENT".equals(delivery)) {
            return "SENT";
        }
        return delivery;
    }

    private static void validatePasswordPolicy(String password) {
        if (password.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Password must be at least 8 characters");
        }
        if (!password.matches(".*[A-Za-z].*") || !password.matches(".*\\d.*")) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST, "Bad Request", "Password must include letters and at least one number");
        }
    }

    private static String maskAccount(String account) {
        String digits = account.replaceAll("\\s+", "");
        if (digits.length() <= 4) {
            return "****";
        }
        return "****" + digits.substring(digits.length() - 4);
    }

    private static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 1) {
            return "***" + email.substring(Math.max(at, 0));
        }
        return email.charAt(0) + "***" + email.substring(at - 1);
    }

    private static String generateOtp() {
        return String.format("%06d", RANDOM.nextInt(1_000_000));
    }

    private static String generateSecureToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
