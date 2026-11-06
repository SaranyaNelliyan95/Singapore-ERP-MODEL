package sg.eyota.workright.leave.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.leave.entity.LeaveTypeEntity;

public interface LeaveTypeRepository extends JpaRepository<LeaveTypeEntity, UUID> {}
