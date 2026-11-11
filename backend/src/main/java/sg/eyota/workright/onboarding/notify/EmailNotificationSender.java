package sg.eyota.workright.onboarding.notify;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import sg.eyota.workright.mail.MailProperties;

/**
 * Uses existing SMTP config (same as employee invitation mail).
 * When mail disabled, still succeeds and outbox records MOCK_LOGGED.
 */
@Component
public class EmailNotificationSender implements NotificationSender {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationSender.class);

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    public EmailNotificationSender(JavaMailSender mailSender, MailProperties mailProperties) {
        this.mailSender = mailSender;
        this.mailProperties = mailProperties;
    }

    @Override
    public NotificationChannel channel() {
        return NotificationChannel.EMAIL;
    }

    @Override
    public String send(NotificationMessage message) {
        String id = "email-" + UUID.randomUUID();
        if (!mailProperties.enabled()) {
            log.info("Email MOCK (MAIL_ENABLED=false) subject={} path={}", message.subject(), message.securePathOnly());
            return "mock-" + id;
        }
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(mailProperties.from());
            mail.setTo(message.destination());
            mail.setSubject(message.subject());
            mail.setText(message.body());
            mailSender.send(mail);
            return id;
        } catch (Exception ex) {
            log.warn("Email send failed (logged to outbox): {}", ex.getMessage());
            throw new IllegalStateException("Email send failed: " + ex.getMessage(), ex);
        }
    }
}
