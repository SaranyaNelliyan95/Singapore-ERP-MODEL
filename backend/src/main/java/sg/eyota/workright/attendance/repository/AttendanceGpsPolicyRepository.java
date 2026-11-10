package sg.eyota.workright.attendance.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.attendance.entity.AttendanceGpsPolicyEntity;

public interface AttendanceGpsPolicyRepository extends JpaRepository<AttendanceGpsPolicyEntity, UUID> {

    Optional<AttendanceGpsPolicyEntity> findFirstByOrderByUpdatedAtDesc();
}
