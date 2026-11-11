package sg.eyota.workright.onboarding;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.auth.repository.AppUserRepository;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.employee.EmployeeCodeGenerator;
import sg.eyota.workright.employee.EmployeeHireRules;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;
import sg.eyota.workright.enrollment.EnrollmentService;
import sg.eyota.workright.enrollment.dto.EnrollmentResponse;
import sg.eyota.workright.onboarding.dto.ActivateOnboardingRequest;
import sg.eyota.workright.onboarding.dto.CreateOnboardingDraftRequest;
import sg.eyota.workright.onboarding.dto.OnboardingActivateResponse;
import sg.eyota.workright.onboarding.dto.OnboardingCandidateDto;
import sg.eyota.workright.onboarding.dto.OnboardingSummaryDto;
import sg.eyota.workright.onboarding.entity.PipelineStatus;

/**
 * HR onboarding facade — preserves draft / advance / activate / invite APIs
 * and delegates stage pipeline work to {@link OnboardingPipelineService}.
 */
@Service
public class OnboardingService {

    private final EmployeeRepository employeeRepository;
    private final AppUserRepository appUserRepository;
    private final EmployeeCodeGenerator codeGenerator;
    private final EnrollmentService enrollmentService;
    private final OnboardingPipelineService pipelineService;

    public OnboardingService(
            EmployeeRepository employeeRepository,
            AppUserRepository appUserRepository,
            EmployeeCodeGenerator codeGenerator,
            EnrollmentService enrollmentService,
            OnboardingPipelineService pipelineService
    ) {
        this.employeeRepository = employeeRepository;
        this.appUserRepository = appUserRepository;
        this.codeGenerator = codeGenerator;
        this.enrollmentService = enrollmentService;
        this.pipelineService = pipelineService;
    }

    @Transactional(readOnly = true)
    public OnboardingSummaryDto summary() {
        return pipelineService.summary();
    }

    @Transactional
    public OnboardingCandidateDto createDraft(CreateOnboardingDraftRequest request, UUID hrUserId) {
        String email = EmployeeHireRules.normalizeEmail(request.email());
        String fullName = EmployeeHireRules.requireName(request.fullName());
        EmployeeHireRules.requireMobile(request.mobile());

        if (employeeRepository.findByPersonalEmailIgnoreCase(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict", "An employee already uses this email");
        }
        if (appUserRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Conflict", "A login already exists for this email");
        }

        String pass = normalizePass(request.employmentPassType());
        boolean foreign = OnboardingPipelineService.isForeignPass(pass);

        EmployeeEntity employee = new EmployeeEntity();
        employee.setEmployeeCode(codeGenerator.nextCode());
        employee.setFullName(fullName);
        employee.setPersonalEmail(email);
        employee.setMobile(request.mobile().trim());
        employee.setDesignation(request.role().trim());
        employee.setDepartment(request.department().trim());
        employee.setDateOfJoining(request.startDate());
        employee.setEmploymentType(EmployeeEntity.EmploymentType.FULL_TIME);
        employee.setEmploymentStatus(EmployeeEntity.EmploymentStatus.PENDING);
        employee.setWorkPassType(pass);
        employee.setWorkerCategory(request.workerCategory());
        employee.setSector(request.sector());
        employee.setNationalityCode(request.nationalityCode());
        employee.setOnboardingStage(EmployeeEntity.OnboardingStage.OFFER);
        employee.setPipelineStatus(PipelineStatus.DRAFT);
        employee.setOnboardingProgress(5);
        employee.setInvitationEmailStatus("NOT_SENT");
        employee.setBasicPay(BigDecimal.ZERO);
        employee.setAllowancesTotal(BigDecimal.ZERO);
        employee.setCurrency("SGD");
        employee.setActive(true);
        employee.setCreatedByUserId(hrUserId);
        employee = employeeRepository.save(employee);

        pipelineService.ensureOnboarding(employee, hrUserId);

        if (request.sendInvitation()) {
            enrollmentService.provisionInvitation(employee.getId(), email, hrUserId);
        }

        if (foreign) {
            // Soft nudge into document collection for foreign workers
            pipelineService.setStatus(
                    employee.getId(),
                    new sg.eyota.workright.onboarding.dto.PipelineActionRequests.SetStatusRequest(
                            PipelineStatus.DOCUMENTS_PENDING.name(),
                            "Auto: foreign worker document collection",
                            false),
                    hrUserId);
        }

        final UUID employeeId = employee.getId();
        final EmployeeEntity saved = employee;
        return pipelineService.listCandidates().stream()
                .filter(c -> c.id().equals(employeeId))
                .findFirst()
                .orElseGet(() -> {
                    EmployeeEntity refreshed = employeeRepository.findById(employeeId).orElse(saved);
                    return OnboardingCandidateDto.from(refreshed, "NOT_PROVISIONED");
                });
    }

    @Transactional
    public OnboardingCandidateDto advance(UUID employeeId, UUID hrUserId) {
        return pipelineService.advance(employeeId, hrUserId);
    }

    @Transactional
    public OnboardingActivateResponse activate(
            UUID employeeId,
            ActivateOnboardingRequest request,
            UUID hrUserId
    ) {
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));

        // Preserve prior behaviour: activate completes onboarding + optional login invite
        pipelineService.ensureOnboarding(employee, hrUserId);
        pipelineService.setStatus(
                employeeId,
                new sg.eyota.workright.onboarding.dto.PipelineActionRequests.SetStatusRequest(
                        PipelineStatus.READY_TO_WORK.name(),
                        request.createLogin() ? "Activate with ESS login" : "Activate without login",
                        true),
                hrUserId);

        employee = employeeRepository.findById(employeeId).orElse(employee);
        String loginEmail = null;
        String inviteStatus = employee.getInvitationEmailStatus();
        String message = "Employee activated in directory (Probation) / Ready to Work.";

        if (request.createLogin()) {
            String email = request.email() != null && !request.email().isBlank()
                    ? request.email()
                    : employee.getPersonalEmail();
            EnrollmentResponse invite = enrollmentService.provisionInvitation(employee.getId(), email, hrUserId);
            loginEmail = invite.workEmail();
            inviteStatus = invite.invitationEmailStatus();
            message = invite.message();
        }

        return new OnboardingActivateResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                loginEmail,
                inviteStatus,
                message
        );
    }

    @Transactional
    public OnboardingCandidateDto sendInvitation(UUID employeeId, UUID hrUserId) {
        EmployeeEntity employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));
        enrollmentService.provisionInvitation(employee.getId(), employee.getPersonalEmail(), hrUserId);
        return pipelineService.listCandidates().stream()
                .filter(c -> c.id().equals(employeeId))
                .findFirst()
                .orElseGet(() -> {
                    EmployeeEntity refreshed = employeeRepository.findById(employeeId).orElse(employee);
                    return OnboardingCandidateDto.from(refreshed, "INVITATION_PENDING");
                });
    }

    private static String normalizePass(String pass) {
        if (pass == null || pass.isBlank()) {
            return "Local";
        }
        return pass.trim();
    }
}
