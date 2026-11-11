package sg.eyota.workright.onboarding;

import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.onboarding.dto.OnboardingDetailDto;
import sg.eyota.workright.onboarding.dto.OnboardingSummaryDto;

@RestController
@RequestMapping("/api/v1/admin/onboarding")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOnboardingController {

    private final OnboardingPipelineService pipelineService;

    public AdminOnboardingController(OnboardingPipelineService pipelineService) {
        this.pipelineService = pipelineService;
    }

    @GetMapping
    public OnboardingSummaryDto summary() {
        return pipelineService.summary();
    }

    @GetMapping("/{employeeId}")
    public OnboardingDetailDto detail(@PathVariable UUID employeeId) {
        return pipelineService.detail(employeeId);
    }
}
