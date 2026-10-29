package sg.eyota.workright.claims.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.claims.entity.ClaimRequestEntity;

public interface ClaimRequestRepository extends JpaRepository<ClaimRequestEntity, UUID> {

    List<ClaimRequestEntity> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    List<ClaimRequestEntity> findByStatusOrderByCreatedAtDesc(ClaimRequestEntity.Status status);
}
