package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.PpeIssuanceEntity;

public interface PpeIssuanceRepository extends JpaRepository<PpeIssuanceEntity, UUID> {
    List<PpeIssuanceEntity> findByEmployeeIdOrderByCreatedAtAsc(UUID employeeId);
    List<PpeIssuanceEntity> findByOnboardingId(UUID onboardingId);
}
