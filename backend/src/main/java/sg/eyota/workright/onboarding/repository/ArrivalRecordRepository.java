package sg.eyota.workright.onboarding.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.ArrivalRecordEntity;

public interface ArrivalRecordRepository extends JpaRepository<ArrivalRecordEntity, UUID> {
    Optional<ArrivalRecordEntity> findByEmployeeId(UUID employeeId);
    Optional<ArrivalRecordEntity> findByOnboardingId(UUID onboardingId);
}
