package sg.eyota.workright.onboarding;

import java.time.LocalDate;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.onboarding.entity.PipelineStatus;
import sg.eyota.workright.onboarding.entity.WorkPassRecordEntity;

@Component
public class OnboardingReminderJob {

    private static final Logger log = LoggerFactory.getLogger(OnboardingReminderJob.class);

    private final OnboardingPipelineService pipelineService;
    private final EmployeeRepository employeeRepository;
    private final OnboardingMailNotifier mailNotifier;

    public OnboardingReminderJob(
            OnboardingPipelineService pipelineService,
            EmployeeRepository employeeRepository,
            OnboardingMailNotifier mailNotifier
    ) {
        this.pipelineService = pipelineService;
        this.employeeRepository = employeeRepository;
        this.mailNotifier = mailNotifier;
    }

    /** Daily IPA expiry reminders (no WP yet). */
    @Scheduled(cron = "0 30 8 * * *", zone = "Asia/Singapore")
    public void remindIpaExpiry() {
        LocalDate until = LocalDate.now().plusDays(14);
        for (WorkPassRecordEntity wp : pipelineService.findExpiringIpa(until)) {
            employeeRepository.findById(wp.getEmployeeId()).ifPresent(emp -> {
                log.info("IPA expiry reminder for {} ({})", emp.getEmployeeCode(), wp.getIpaExpiryDate());
                mailNotifier.notifyStatus(
                        emp,
                        emp.getPipelineStatus() != null ? emp.getPipelineStatus() : PipelineStatus.IPA_APPROVED,
                        "Reminder: IPA " + wp.getIpaNumber() + " expires on " + wp.getIpaExpiryDate()
                                + ". Complete arrival / WP issuance steps before expiry.");
            });
        }
    }
}
