package sg.eyota.workright.onboarding.notify;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.onboarding.entity.CandidateOnboardingEntity;
import sg.eyota.workright.onboarding.entity.OnboardingSecureLinkEntity;
import sg.eyota.workright.onboarding.repository.CandidateOnboardingRepository;
import sg.eyota.workright.onboarding.repository.OnboardingSecureLinkRepository;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowProperties;

@Service
public class OnboardingSecureLinkService {

    public static final String ACTION_ARRIVAL = "ARRIVAL";
    public static final String ACTION_CONTRACT = "CONTRACT";
    public static final String ACTION_PPE = "PPE";

    private final OnboardingSgFlowProperties properties;
    private final OnboardingSecureLinkRepository linkRepository;
    private final CandidateOnboardingRepository onboardingRepository;
    private final EmployeeRepository employeeRepository;
    private final OnboardingNotificationService notificationService;
    private final String publicBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public OnboardingSecureLinkService(
            OnboardingSgFlowProperties properties,
            OnboardingSecureLinkRepository linkRepository,
            CandidateOnboardingRepository onboardingRepository,
            EmployeeRepository employeeRepository,
            OnboardingNotificationService notificationService,
            @Value("${eyota.enrollment.activate-base-url:http://localhost:4200/activate-account}") String activateBase
    ) {
        this.properties = properties;
        this.linkRepository = linkRepository;
        this.onboardingRepository = onboardingRepository;
        this.employeeRepository = employeeRepository;
        this.notificationService = notificationService;
        // Derive app origin for confirm links
        String origin = activateBase;
        int idx = activateBase.indexOf("/activate");
        if (idx > 0) {
            origin = activateBase.substring(0, idx);
        }
        this.publicBaseUrl = origin.endsWith("/") ? origin.substring(0, origin.length() - 1) : origin;
    }

    public record SendResult(String actionType, String path, boolean emailQueued, boolean whatsappQueued) {}

    @Transactional
    public List<SendResult> sendConfirmationLinks(UUID employeeId, UUID actorUserId) {
        if (!properties.isSgFlowV2()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request",
                    "onboardingSgFlowV2 is disabled");
        }
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
        CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Onboarding not found"));

        return List.of(
                issueAndNotify(employee, co, ACTION_ARRIVAL, actorUserId),
                issueAndNotify(employee, co, ACTION_CONTRACT, actorUserId),
                issueAndNotify(employee, co, ACTION_PPE, actorUserId)
        );
    }

    @Transactional
    public SendResult sendSingleLink(UUID employeeId, String actionType, UUID actorUserId) {
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
        CandidateOnboardingEntity co = onboardingRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Onboarding not found"));
        return issueAndNotify(employee, co, actionType.toUpperCase(Locale.ROOT), actorUserId);
    }

    private SendResult issueAndNotify(
            EmployeeEntity employee, CandidateOnboardingEntity co, String action, UUID actor
    ) {
        // Revoke prior unused links for this action
        for (OnboardingSecureLinkEntity old : linkRepository
                .findByOnboardingIdAndActionTypeAndRevokedAtIsNullAndUsedAtIsNull(co.getId(), action)) {
            old.setRevokedAt(Instant.now());
            linkRepository.save(old);
        }

        byte[] raw = new byte[32]; // 256-bit
        secureRandom.nextBytes(raw);
        String token = HexFormat.of().formatHex(raw);
        String hash = sha256(token);

        OnboardingSecureLinkEntity link = new OnboardingSecureLinkEntity();
        link.setEmployeeId(employee.getId());
        link.setOnboardingId(co.getId());
        link.setActionType(action);
        link.setTokenHash(hash);
        link.setExpiresAt(Instant.now().plus(48, ChronoUnit.HOURS));
        link.setCreatedByUserId(actor);
        linkRepository.save(link);

        String path = "/confirm/" + action.toLowerCase(Locale.ROOT) + "?t=" + token;
        String url = publicBaseUrl + path;
        String subject;
        String body;
        if (ACTION_PPE.equals(action)) {
            subject = "Action required: confirm PPE received";
            body = "Please sign in and open this secure link to confirm you have received your PPE kit. "
                    + "You will be asked to take or upload a photo showing you with the PPE. "
                    + "The link expires in 48 hours and contains no personal details.\n\n" + url;
        } else {
            subject = "Action required: confirm your onboarding step";
            body = "Please open this secure link to continue your onboarding confirmation. "
                    + "The link expires in 48 hours and contains no personal details.\n\n" + url;
        }

        boolean emailOk = false;
        boolean waOk = false;
        if (employee.getPersonalEmail() != null && !employee.getPersonalEmail().isBlank()) {
            notificationService.dispatch(new NotificationMessage(
                    employee.getId(), co.getId(), NotificationChannel.EMAIL,
                    "ONBOARDING_CONFIRM_LINK", employee.getPersonalEmail(), subject, body, path));
            emailOk = true;
        }
        if (employee.getMobile() != null && !employee.getMobile().isBlank()) {
            notificationService.dispatch(new NotificationMessage(
                    employee.getId(), co.getId(), NotificationChannel.WHATSAPP,
                    "onboarding_confirm_link", employee.getMobile(), subject, body, path));
            waOk = true;
        }
        return new SendResult(action, path, emailOk, waOk);
    }

    @Transactional
    public OnboardingSecureLinkEntity requireValidToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bad Request", "Missing token");
        }
        String hash = sha256(rawToken.trim());
        OnboardingSecureLinkEntity link = linkRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid link",
                        "Link is invalid or tampered"));
        if (link.getRevokedAt() != null) {
            throw new ApiException(HttpStatus.GONE, "Revoked", "This link was revoked. Ask HR to resend.");
        }
        if (link.getUsedAt() != null) {
            throw new ApiException(HttpStatus.GONE, "Used", "This link was already used.");
        }
        if (link.getLockedAt() != null || link.getFailedAttempts() >= 5) {
            throw new ApiException(HttpStatus.LOCKED, "Locked",
                    "Too many failed attempts. Ask HR to resend a new link.");
        }
        if (link.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.GONE, "Expired", "This link expired (48h). Ask HR to resend.");
        }
        return link;
    }

    @Transactional
    public void recordFailure(OnboardingSecureLinkEntity link) {
        link.setFailedAttempts(link.getFailedAttempts() + 1);
        if (link.getFailedAttempts() >= 5) {
            link.setLockedAt(Instant.now());
        }
        linkRepository.save(link);
    }

    @Transactional
    public void markUsed(OnboardingSecureLinkEntity link) {
        link.setUsedAt(Instant.now());
        linkRepository.save(link);
    }

    private static String sha256(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] dig = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(dig);
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
