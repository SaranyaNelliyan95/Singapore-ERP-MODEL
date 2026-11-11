package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.OnboardingTaskEntity;

public interface OnboardingTaskRepository extends JpaRepository<OnboardingTaskEntity, UUID> {
    List<OnboardingTaskEntity> findByOnboardingIdOrderBySortOrderAsc(UUID onboardingId);
    Optional<OnboardingTaskEntity> findByOnboardingIdAndTaskCode(UUID onboardingId, String taskCode);
}
