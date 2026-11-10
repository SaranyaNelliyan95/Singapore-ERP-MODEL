package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.EmployeeAcknowledgementEntity;

public interface EmployeeAcknowledgementRepository extends JpaRepository<EmployeeAcknowledgementEntity, UUID> {
    List<EmployeeAcknowledgementEntity> findByEmployeeId(UUID employeeId);
    Optional<EmployeeAcknowledgementEntity> findByOnboardingIdAndAckType(UUID onboardingId, String ackType);
}
