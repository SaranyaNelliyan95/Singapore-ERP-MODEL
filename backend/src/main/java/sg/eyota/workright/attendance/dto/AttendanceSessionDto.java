package sg.eyota.workright.attendance.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;

public record AttendanceSessionDto(
        UUID id,
        UUID employeeId,
        UUID workplaceId,
        LocalDate attendanceDate,
        Instant clockInAt,
        Instant clockOutAt,
        AttendanceSessionEntity.GeofenceResult geofenceResult,
        Double distanceMetres,
        AttendanceSessionEntity.SessionStatus status,
        AttendanceSessionEntity.WorkMode workMode
) {
    public static AttendanceSessionDto from(AttendanceSessionEntity s) {
        return new AttendanceSessionDto(
                s.getId(),
                s.getEmployeeId(),
                s.getWorkplaceId(),
                s.getAttendanceDate(),
                s.getClockInAt(),
                s.getClockOutAt(),
                s.getGeofenceResult(),
                s.getDistanceMetres(),
                s.getStatus(),
                s.getWorkMode()
        );
    }
}
