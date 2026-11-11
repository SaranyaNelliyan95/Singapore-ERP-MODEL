package sg.eyota.workright.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class MailStartupLogger implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MailStartupLogger.class);

    private final MailProperties mailProperties;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    public MailStartupLogger(
            MailProperties mailProperties,
            @Autowired(required = false) JavaMailSender mailSender
    ) {
        this.mailProperties = mailProperties;
        this.mailSender = mailSender;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean hostOk = smtpHost != null && !smtpHost.isBlank();
        boolean userOk = smtpUsername != null && !smtpUsername.isBlank();
        boolean passOk = smtpPassword != null && !smtpPassword.isBlank();
        log.info(
                "Mail config: enabled={} from={} smtpHostSet={} usernameSet={} passwordSet={} javaMailSenderBean={}",
                mailProperties.enabled(),
                mailProperties.from(),
                hostOk,
                userOk,
                passOk,
                mailSender != null);
        if (mailProperties.enabled() && (!hostOk || !userOk || !passOk || mailSender == null)) {
            log.error(
                    "MAIL_ENABLED=true but SMTP is incomplete — invitation emails will FAIL. "
                            + "Put SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD in backend/.env and restart.");
        } else if (!mailProperties.enabled()) {
            log.warn("MAIL_ENABLED=false — invitations are logged only, not delivered to inboxes.");
        } else {
            log.info("SMTP looks configured — invitation emails should reach recipients (check Spam).");
        }
    }
}
