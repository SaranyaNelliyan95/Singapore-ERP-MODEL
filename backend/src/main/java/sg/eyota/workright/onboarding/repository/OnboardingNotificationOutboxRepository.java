package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.OnboardingNotificationOutboxEntity;

public interface OnboardingNotificationOutboxRepository
        extends JpaRepository<OnboardingNotificationOutboxEntity, UUID> {
    List<OnboardingNotificationOutboxEntity> findTop100ByOrderByCreatedAtDesc();
}
