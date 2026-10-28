package sg.eyota.workright.enrollment.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.enrollment.entity.EmployeeInvitationEntity;

public interface EmployeeInvitationRepository extends JpaRepository<EmployeeInvitationEntity, UUID> {

    Optional<EmployeeInvitationEntity> findFirstByEmailIgnoreCaseAndStatusOrderByCreatedAtDesc(
            String email, EmployeeInvitationEntity.Status status);

    List<EmployeeInvitationEntity> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);
}
