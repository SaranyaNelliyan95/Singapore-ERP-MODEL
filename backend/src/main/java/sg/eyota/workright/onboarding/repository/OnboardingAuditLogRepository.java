package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.OnboardingAuditLogEntity;

public interface OnboardingAuditLogRepository extends JpaRepository<OnboardingAuditLogEntity, UUID> {
    List<OnboardingAuditLogEntity> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);
}
