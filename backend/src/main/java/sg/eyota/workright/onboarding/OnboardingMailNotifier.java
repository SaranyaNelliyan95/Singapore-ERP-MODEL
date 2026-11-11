package sg.eyota.workright.onboarding;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import sg.eyota.workright.config.EyotaProperties;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.mail.EmailSender;
import sg.eyota.workright.mail.MailProperties;
import sg.eyota.workright.onboarding.entity.PipelineStatus;

@Component
public class OnboardingMailNotifier {

    private static final Logger log = LoggerFactory.getLogger(OnboardingMailNotifier.class);

    private final EmailSender emailSender;
    private final MailProperties mailProperties;
    private final EyotaProperties properties;

    public OnboardingMailNotifier(
            EmailSender emailSender,
            MailProperties mailProperties,
            EyotaProperties properties
    ) {
        this.emailSender = emailSender;
        this.mailProperties = mailProperties;
        this.properties = properties;
    }

    public void notifyStatus(EmployeeEntity employee, PipelineStatus status, String message) {
        String email = employee.getPersonalEmail();
        if (email == null || email.isBlank()) {
            return;
        }
        String subject = "Eyota onboarding update — " + status.name().replace('_', ' ');
        String plain = """
                Dear %s,

                %s

                Current onboarding status: %s

                You can sign in (once activated) or use links from HR emails to complete required actions.

                Regards,
                HR Team
                Eyota Pvt. Ltd.
                """.formatted(employee.getFullName(), message, status.name());
        String html = """
                <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#243447;line-height:1.5">
                  <h2 style="color:#2f5d7c">Onboarding update</h2>
                  <p>Dear %s,</p>
                  <p>%s</p>
                  <p>Current status: <strong>%s</strong></p>
                  <p>Regards,<br/>HR Team<br/>Eyota Pvt. Ltd.</p>
                </div>
                """.formatted(escape(employee.getFullName()), escape(message), status.name());
        try {
            emailSender.sendHtml(email, subject, plain, html);
        } catch (Exception ex) {
            log.warn("Onboarding status email failed for {}: {}", email, ex.getMessage());
        }
    }

    public void notifyDocumentPackageReady(EmployeeEntity employee) {
        String base = properties.enrollment().activateBaseUrl().replace("/activate-account", "/login");
        notifyStatus(
                employee,
                PipelineStatus.IPA_APPROVED,
                "Your IPA package is recorded. HR will share secure document access after you activate your login. "
                        + "Portal: " + base
        );
    }

    public void notifyReadyToWork(EmployeeEntity employee) {
        notifyStatus(
                employee,
                PipelineStatus.READY_TO_WORK,
                "You are marked Ready to Work. Complete account activation (OTP + password) if you have not already, "
                        + "acknowledge your contract, and confirm PPE receipt in the Employee portal."
        );
    }

    public boolean mailEnabled() {
        return mailProperties.enabled();
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
