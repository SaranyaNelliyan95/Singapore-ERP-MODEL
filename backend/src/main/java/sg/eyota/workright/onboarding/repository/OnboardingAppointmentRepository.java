package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.OnboardingAppointmentEntity;

public interface OnboardingAppointmentRepository extends JpaRepository<OnboardingAppointmentEntity, UUID> {
    List<OnboardingAppointmentEntity> findByEmployeeIdOrderByScheduledAtDesc(UUID employeeId);
}
