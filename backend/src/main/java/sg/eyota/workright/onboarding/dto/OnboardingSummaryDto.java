package sg.eyota.workright.onboarding.dto;

import java.util.List;

public record OnboardingSummaryDto(
        int totalActive,
        int offerCount,
        int momFormsCount,
        int medicalCount,
        int orientationCount,
        List<OnboardingCandidateDto> candidates
) {}
