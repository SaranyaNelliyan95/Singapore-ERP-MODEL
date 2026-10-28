package sg.eyota.workright.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Dev-friendly mailer: writes the message to application logs.
 * Replace with SMTP JavaMailSender when MAIL_HOST is configured in production.
 */
@Component
public class LoggingEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

    @Override
    public void send(String to, String subject, String plainBody) {
        log.info("""
                ===== WORKRIGHT EMAIL (logged; not SMTP) =====
                To: {}
                Subject: {}
                ---
                {}
                ==============================================
                """, to, subject, plainBody);
    }
}
