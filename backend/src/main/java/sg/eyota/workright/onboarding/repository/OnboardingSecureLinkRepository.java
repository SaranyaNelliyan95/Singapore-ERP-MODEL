package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.OnboardingSecureLinkEntity;

public interface OnboardingSecureLinkRepository extends JpaRepository<OnboardingSecureLinkEntity, UUID> {
    Optional<OnboardingSecureLinkEntity> findByTokenHash(String tokenHash);

    List<OnboardingSecureLinkEntity> findByOnboardingIdAndActionTypeAndRevokedAtIsNullAndUsedAtIsNull(
            UUID onboardingId, String actionType);

    /** Open (unused, unrevoked) confirmation links for an employee — drives ESS Latest requests. */
    List<OnboardingSecureLinkEntity> findByEmployeeIdAndRevokedAtIsNullAndUsedAtIsNull(UUID employeeId);
}
