package sg.eyota.workright.attendance.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;

public record AttendanceSessionDto(
        UUID id,
        UUID employeeId,
        String employeeName,
        String employeeCode,
        UUID workplaceId,
        LocalDate attendanceDate,
        Instant clockInAt,
        Instant clockOutAt,
        Double clockInLat,
        Double clockInLng,
        Double clockInAccuracy,
        Double clockOutLat,
        Double clockOutLng,
        Double clockOutAccuracy,
        AttendanceSessionEntity.GeofenceResult geofenceResult,
        Double distanceMetres,
        AttendanceSessionEntity.SessionStatus status,
        AttendanceSessionEntity.WorkMode workMode
) {
    public static AttendanceSessionDto from(AttendanceSessionEntity s) {
        return from(s, null, null);
    }

    public static AttendanceSessionDto from(AttendanceSessionEntity s, String employeeName, String employeeCode) {
        return new AttendanceSessionDto(
                s.getId(),
                s.getEmployeeId(),
                employeeName,
                employeeCode,
                s.getWorkplaceId(),
                s.getAttendanceDate(),
                s.getClockInAt(),
                s.getClockOutAt(),
                s.getClockInLat(),
                s.getClockInLng(),
                s.getClockInAccuracy(),
                s.getClockOutLat(),
                s.getClockOutLng(),
                s.getClockOutAccuracy(),
                s.getGeofenceResult(),
                s.getDistanceMetres(),
                s.getStatus(),
                s.getWorkMode()
        );
    }
}
