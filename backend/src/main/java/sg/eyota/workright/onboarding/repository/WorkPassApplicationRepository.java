package sg.eyota.workright.onboarding.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.onboarding.entity.WorkPassApplicationEntity;

public interface WorkPassApplicationRepository extends JpaRepository<WorkPassApplicationEntity, UUID> {
    List<WorkPassApplicationEntity> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);
}
