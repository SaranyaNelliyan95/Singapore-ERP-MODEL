package sg.eyota.workright.onboarding.notify;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Default WhatsApp adapter for local/dev — never calls a real provider.
 * Set WHATSAPP_MODE=live + WHATSAPP_* env vars later to swap in a real client.
 */
@Component
public class MockWhatsAppSender implements NotificationSender {

    private static final Logger log = LoggerFactory.getLogger(MockWhatsAppSender.class);

    private final String mode;
    private final String templateName;

    public MockWhatsAppSender(
            @Value("${eyota.onboarding.whatsapp.mode:mock}") String mode,
            @Value("${eyota.onboarding.whatsapp.template-confirm-link:onboarding_confirm_link}") String templateName
    ) {
        this.mode = mode;
        this.templateName = templateName;
    }

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.WHATSAPP;
    }

    @Override
    public String send(NotificationMessage message) {
        String mockId = "wa-mock-" + UUID.randomUUID();
        // Never log FIN/passport/name — destination is already masked by caller when logging
        log.info("WhatsApp MOCK send template={} mode={} destMasked={} path={}",
                templateName, mode, mask(message.destination()), message.securePathOnly());
        if ("live".equalsIgnoreCase(mode)) {
            // TODO: call WhatsApp Business Cloud API with WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID
            log.warn("WhatsApp mode=live but live client not wired yet — message logged to outbox only ({})", mockId);
        }
        return mockId;
    }

    private static String mask(String dest) {
        if (dest == null || dest.length() < 4) {
            return "****";
        }
        return "****" + dest.substring(dest.length() - 4);
    }
}
