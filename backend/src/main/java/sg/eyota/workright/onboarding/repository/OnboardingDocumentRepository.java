package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.OnboardingDocumentEntity;

public interface OnboardingDocumentRepository extends JpaRepository<OnboardingDocumentEntity, UUID> {
    List<OnboardingDocumentEntity> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);
    List<OnboardingDocumentEntity> findByOnboardingIdOrderByCreatedAtDesc(UUID onboardingId);
    int countByOnboardingIdAndDocType(UUID onboardingId, sg.eyota.workright.onboarding.entity.OnboardingDocType docType);
}
