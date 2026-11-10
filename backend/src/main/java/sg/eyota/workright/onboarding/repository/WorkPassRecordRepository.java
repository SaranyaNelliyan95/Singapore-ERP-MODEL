package sg.eyota.workright.onboarding.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sg.eyota.workright.onboarding.entity.WorkPassRecordEntity;

public interface WorkPassRecordRepository extends JpaRepository<WorkPassRecordEntity, UUID> {
    Optional<WorkPassRecordEntity> findByEmployeeId(UUID employeeId);
    Optional<WorkPassRecordEntity> findByOnboardingId(UUID onboardingId);

    @Query("""
            SELECT w FROM WorkPassRecordEntity w
            WHERE w.ipaExpiryDate IS NOT NULL
              AND w.ipaExpiryDate <= :until
              AND (w.wpNumber IS NULL OR w.wpNumber = '')
            """)
    List<WorkPassRecordEntity> findExpiringIpaWithoutWp(@Param("until") LocalDate until);
}
