package sg.eyota.workright.onboarding;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Component;
import sg.eyota.workright.onboarding.entity.OnboardingTaskEntity;
import sg.eyota.workright.onboarding.entity.OnboardingTaskStatus;
import sg.eyota.workright.onboarding.entity.PipelineStatus;

@Component
public class OnboardingChecklistFactory {

    public List<OnboardingTaskEntity> build(UUID employeeId, UUID onboardingId, boolean foreignWorker) {
        List<OnboardingTaskEntity> tasks = new ArrayList<>();
        int order = 10;
        tasks.add(task(employeeId, onboardingId, "COLLECT_DOCS", "Collect candidate documents",
                PipelineStatus.DOCUMENTS_PENDING, true, order));
        order += 10;
        if (foreignWorker) {
            tasks.add(task(employeeId, onboardingId, "MOM_APPLICATION", "Record MOM work pass application",
                    PipelineStatus.APPLICATION_SUBMITTED, true, order));
            order += 10;
            tasks.add(task(employeeId, onboardingId, "IPA_UPLOAD", "Upload IPA full set",
                    PipelineStatus.IPA_APPROVED, true, order));
            order += 10;
            tasks.add(task(employeeId, onboardingId, "PRE_ARRIVAL", "Pre-arrival: bond / insurance / housing / flight",
                    PipelineStatus.PRE_ARRIVAL_PENDING, true, order));
            order += 10;
            tasks.add(task(employeeId, onboardingId, "ARRIVAL", "Confirm arrival & accommodation",
                    PipelineStatus.ARRIVED_IN_SINGAPORE, true, order));
            order += 10;
            tasks.add(task(employeeId, onboardingId, "MEDICAL_SIP", "Medical / SIP / Onboard programmes",
                    PipelineStatus.POST_ARRIVAL_PENDING, true, order));
            order += 10;
            tasks.add(task(employeeId, onboardingId, "WP_ISSUANCE", "Record work permit issuance",
                    PipelineStatus.WORK_PERMIT_ISSUED, true, order));
            order += 10;
        } else {
            tasks.add(task(employeeId, onboardingId, "LOCAL_FORMS", "Complete local hire / MOM forms",
                    PipelineStatus.APPLICATION_SUBMITTED, true, order));
            order += 10;
            OnboardingTaskEntity medical = task(employeeId, onboardingId, "MEDICAL_SIP",
                    "Medical (mark N/A if not required)", PipelineStatus.POST_ARRIVAL_PENDING, false, order);
            medical.setStatus(OnboardingTaskStatus.NOT_APPLICABLE);
            tasks.add(medical);
            order += 10;
        }
        tasks.add(task(employeeId, onboardingId, "ACCOUNT_ACTIVATE", "Account activation (OTP + password)",
                PipelineStatus.ONBOARDING_IN_PROGRESS, true, order));
        order += 10;
        tasks.add(task(employeeId, onboardingId, "CONTRACT_ACK", "Employment contract acknowledgement",
                PipelineStatus.ONBOARDING_IN_PROGRESS, true, order));
        order += 10;
        tasks.add(task(employeeId, onboardingId, "PPE_CONFIRM", "PPE issuance & employee confirmation",
                PipelineStatus.ONBOARDING_IN_PROGRESS, true, order));
        order += 10;
        tasks.add(task(employeeId, onboardingId, "INDUCTION", "Safety / workplace induction",
                PipelineStatus.ONBOARDING_IN_PROGRESS, true, order));
        order += 10;
        tasks.add(task(employeeId, onboardingId, "READY_TO_WORK", "Ready to Work gate",
                PipelineStatus.READY_TO_WORK, true, order));
        return tasks;
    }

    private static OnboardingTaskEntity task(
            UUID employeeId,
            UUID onboardingId,
            String code,
            String title,
            PipelineStatus gate,
            boolean mandatory,
            int sortOrder
    ) {
        OnboardingTaskEntity t = new OnboardingTaskEntity();
        t.setEmployeeId(employeeId);
        t.setOnboardingId(onboardingId);
        t.setTaskCode(code);
        t.setTitle(title);
        t.setStageGate(gate);
        t.setStatus(OnboardingTaskStatus.PENDING);
        t.setMandatory(mandatory);
        t.setSortOrder(sortOrder);
        return t;
    }
}
