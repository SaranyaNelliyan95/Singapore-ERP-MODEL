package sg.eyota.workright.onboarding.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import sg.eyota.workright.onboarding.entity.OnboardingTaskEntity;

public record OnboardingTaskDto(
        UUID id,
        String taskCode,
        String title,
        String stageGate,
        String status,
        boolean mandatory,
        LocalDate dueDate,
        Instant completedAt,
        String notes,
        int sortOrder,
        boolean applies,
        String warningText
) {
    public static OnboardingTaskDto from(OnboardingTaskEntity e) {
        return new OnboardingTaskDto(
                e.getId(),
                e.getTaskCode(),
                e.getTitle(),
                e.getStageGate() != null ? e.getStageGate().name() : null,
                e.getStatus().name(),
                e.isMandatory(),
                e.getDueDate(),
                e.getCompletedAt(),
                e.getNotes(),
                e.getSortOrder(),
                e.isApplies(),
                e.getWarningText()
        );
    }
}
