package sg.eyota.workright.leave.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.leave.entity.LeaveBalanceEntity;

public interface LeaveBalanceRepository extends JpaRepository<LeaveBalanceEntity, UUID> {

    List<LeaveBalanceEntity> findByEmployeeId(UUID employeeId);
}
