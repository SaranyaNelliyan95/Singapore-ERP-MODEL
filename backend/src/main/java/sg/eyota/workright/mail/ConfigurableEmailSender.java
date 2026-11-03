package sg.eyota.workright.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import sg.eyota.workright.common.exception.ApiException;

import jakarta.mail.internet.MimeMessage;

/**
 * Uses SMTP when spring.mail.host is configured and eyota.mail.enabled=true;
 * otherwise logs the message (local/dev). Never logs OTP or invitation tokens.
 */
@Component
public class ConfigurableEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(ConfigurableEmailSender.class);

    private final MailProperties mailProperties;
    private final JavaMailSender mailSender;

    public ConfigurableEmailSender(
            MailProperties mailProperties,
            @Autowired(required = false) JavaMailSender mailSender
    ) {
        this.mailProperties = mailProperties;
        this.mailSender = mailSender;
    }

    @Override
    public void send(String to, String subject, String plainBody) {
        sendHtml(to, subject, plainBody, null);
    }

    @Override
    public void sendHtml(String to, String subject, String plainBody, String htmlBody) {
        if (mailProperties.enabled()) {
            if (mailSender == null) {
                throw new ApiException(
                        HttpStatus.BAD_GATEWAY,
                        "Email Delivery Failed",
                        "MAIL_ENABLED=true but SMTP bean is missing. Set SMTP_HOST in backend/.env and restart."
                );
            }
            try {
                if (htmlBody != null && !htmlBody.isBlank()) {
                    MimeMessage mime = mailSender.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
                    helper.setTo(to);
                    helper.setSubject(subject);
                    helper.setText(plainBody != null ? plainBody : "", htmlBody);
                    applyFrom(helper);
                    mailSender.send(mime);
                } else {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setTo(to);
                    message.setSubject(subject);
                    message.setText(plainBody);
                    String from = mailProperties.from();
                    if (from != null && !from.isBlank()) {
                        message.setFrom(from);
                    }
                    mailSender.send(message);
                }
                log.info("Email accepted by SMTP for recipient={} subject={}", to, subject);
                return;
            } catch (ApiException ex) {
                throw ex;
            } catch (Exception ex) {
                Throwable root = ex;
                while (root.getCause() != null && root.getCause() != root) {
                    root = root.getCause();
                }
                String detail = root.getMessage() != null ? root.getMessage() : ex.getMessage();
                log.error("SMTP send failed to {}: {}", to, detail);
                throw new ApiException(
                        HttpStatus.BAD_GATEWAY,
                        "Email Delivery Failed",
                        "Could not send email via Gmail SMTP: " + detail
                );
            }
        }
        log.info(
                "EMAIL (logged only — MAIL_ENABLED=false) to={} subject={} plainLen={} htmlLen={}",
                to,
                subject,
                plainBody != null ? plainBody.length() : 0,
                htmlBody != null ? htmlBody.length() : 0);
        log.warn(
                "No real inbox delivery: set MAIL_ENABLED=true and SMTP_* in backend/.env then restart.");
    }

    private void applyFrom(MimeMessageHelper helper) throws Exception {
        String from = mailProperties.from();
        if (from == null || from.isBlank()) {
            return;
        }
        if (mailProperties.fromName() != null && !mailProperties.fromName().isBlank()) {
            helper.setFrom(from, mailProperties.fromName());
        } else {
            helper.setFrom(from);
        }
    }
}
