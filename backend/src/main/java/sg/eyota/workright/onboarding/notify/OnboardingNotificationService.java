package sg.eyota.workright.onboarding.notify;

import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.onboarding.entity.OnboardingNotificationOutboxEntity;
import sg.eyota.workright.onboarding.repository.OnboardingNotificationOutboxRepository;
import sg.eyota.workright.onboarding.sg.OnboardingSgFlowService;

@Service
public class OnboardingNotificationService {

    private final Map<NotificationChannel, NotificationSender> senders;
    private final OnboardingNotificationOutboxRepository outboxRepository;

    public OnboardingNotificationService(
            List<NotificationSender> senderList,
            OnboardingNotificationOutboxRepository outboxRepository
    ) {
        this.outboxRepository = outboxRepository;
        this.senders = new EnumMap<>(NotificationChannel.class);
        for (NotificationSender s : senderList) {
            this.senders.put(s.channel(), s);
        }
    }

    @Transactional
    public OnboardingNotificationOutboxEntity dispatch(NotificationMessage message) {
        NotificationSender sender = senders.get(message.channel());
        OnboardingNotificationOutboxEntity row = new OnboardingNotificationOutboxEntity();
        row.setEmployeeId(message.employeeId());
        row.setOnboardingId(message.onboardingId());
        row.setChannel(message.channel().name());
        row.setTemplateCode(message.templateCode());
        row.setDestinationMasked(maskDestination(message.channel(), message.destination()));
        row.setSubject(message.subject());
        row.setBodyPreview(trim(message.body(), 400));
        try {
            if (sender == null) {
                row.setStatus("NO_ADAPTER");
                row.setErrorMessage("No sender for " + message.channel());
            } else {
                String providerId = sender.send(message);
                row.setProviderMessageId(providerId);
                row.setStatus(providerId != null && providerId.startsWith("mock")
                        ? "MOCK_LOGGED" : "SENT");
            }
        } catch (Exception ex) {
            row.setStatus("FAILED");
            row.setErrorMessage(ex.getMessage());
        }
        return outboxRepository.save(row);
    }

    @Transactional(readOnly = true)
    public List<OnboardingNotificationOutboxEntity> recentOutbox() {
        return outboxRepository.findTop100ByOrderByCreatedAtDesc();
    }

    private static String maskDestination(NotificationChannel channel, String dest) {
        if (dest == null || dest.isBlank()) {
            return "****";
        }
        if (channel == NotificationChannel.EMAIL) {
            int at = dest.indexOf('@');
            if (at > 1) {
                return dest.charAt(0) + "***" + dest.substring(at);
            }
        }
        return OnboardingSgFlowService.maskId(dest) != null
                ? OnboardingSgFlowService.maskId(dest)
                : "****" + dest.substring(Math.max(0, dest.length() - 4));
    }

    private static String trim(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
