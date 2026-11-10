package sg.eyota.workright.attendance.dto;

import java.time.Instant;

import sg.eyota.workright.attendance.entity.AttendanceGpsPolicyEntity;

public record AttendanceGpsPolicyDto(
        boolean gpsMandatory,
        Instant updatedAt
) {
    public static AttendanceGpsPolicyDto from(AttendanceGpsPolicyEntity e) {
        return new AttendanceGpsPolicyDto(e.isGpsMandatory(), e.getUpdatedAt());
    }
}
