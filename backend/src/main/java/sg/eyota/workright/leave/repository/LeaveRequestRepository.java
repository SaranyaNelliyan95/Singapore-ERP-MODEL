package sg.eyota.workright.leave.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.leave.entity.LeaveRequestEntity;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequestEntity, UUID> {

    List<LeaveRequestEntity> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    List<LeaveRequestEntity> findByStatusOrderByCreatedAtDesc(LeaveRequestEntity.Status status);
}
