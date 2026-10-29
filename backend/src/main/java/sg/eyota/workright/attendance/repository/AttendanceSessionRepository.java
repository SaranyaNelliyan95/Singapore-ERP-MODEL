package sg.eyota.workright.attendance.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSessionEntity, UUID> {

    Optional<AttendanceSessionEntity> findByEmployeeIdAndAttendanceDate(UUID employeeId, LocalDate attendanceDate);

    List<AttendanceSessionEntity> findByEmployeeIdOrderByAttendanceDateDesc(UUID employeeId);

    List<AttendanceSessionEntity> findByAttendanceDateBetweenOrderByAttendanceDateDesc(LocalDate from, LocalDate to);
}
