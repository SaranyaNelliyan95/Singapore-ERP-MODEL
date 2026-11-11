package sg.eyota.workright.onboarding.notify;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.onboarding.entity.OnboardingNotificationOutboxEntity;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/hr/onboarding")
@PreAuthorize("hasAnyRole('HR','ADMIN')")
public class HrOnboardingNotifyController {

    private final OnboardingSecureLinkService secureLinkService;
    private final OnboardingNotificationService notificationService;

    public HrOnboardingNotifyController(
            OnboardingSecureLinkService secureLinkService,
            OnboardingNotificationService notificationService
    ) {
        this.secureLinkService = secureLinkService;
        this.notificationService = notificationService;
    }

    /** Sends the same confirmation links by email AND WhatsApp (mock in local). */
    @PostMapping("/{employeeId}/send-confirmation-links")
    public List<OnboardingSecureLinkService.SendResult> sendLinks(@PathVariable UUID employeeId) {
        return secureLinkService.sendConfirmationLinks(employeeId, SecurityUtils.currentUser().getUserId());
    }

    @PostMapping("/{employeeId}/send-confirmation-link/{actionType}")
    public OnboardingSecureLinkService.SendResult sendOne(
            @PathVariable UUID employeeId, @PathVariable String actionType
    ) {
        return secureLinkService.sendSingleLink(employeeId, actionType, SecurityUtils.currentUser().getUserId());
    }

    /** Dev outbox — mock WhatsApp/email deliveries for local verification. */
    @GetMapping("/notification-outbox")
    public List<Map<String, Object>> outbox() {
        return notificationService.recentOutbox().stream().map(this::toMap).toList();
    }

    private Map<String, Object> toMap(OnboardingNotificationOutboxEntity e) {
        java.util.LinkedHashMap<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", e.getId().toString());
        m.put("employeeId", e.getEmployeeId() != null ? e.getEmployeeId().toString() : "");
        m.put("channel", e.getChannel());
        m.put("templateCode", e.getTemplateCode() != null ? e.getTemplateCode() : "");
        m.put("destinationMasked", e.getDestinationMasked() != null ? e.getDestinationMasked() : "");
        m.put("subject", e.getSubject() != null ? e.getSubject() : "");
        m.put("bodyPreview", e.getBodyPreview() != null ? e.getBodyPreview() : "");
        m.put("status", e.getStatus());
        m.put("providerMessageId", e.getProviderMessageId() != null ? e.getProviderMessageId() : "");
        m.put("createdAt", e.getCreatedAt() != null ? e.getCreatedAt().toString() : "");
        return m;
    }
}
