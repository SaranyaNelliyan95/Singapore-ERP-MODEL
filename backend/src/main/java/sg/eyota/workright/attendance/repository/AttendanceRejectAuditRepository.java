package sg.eyota.workright.attendance.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.attendance.entity.AttendanceRejectAuditEntity;

public interface AttendanceRejectAuditRepository extends JpaRepository<AttendanceRejectAuditEntity, UUID> {}
