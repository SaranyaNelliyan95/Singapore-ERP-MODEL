package sg.eyota.workright.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;

/**
 * Coordinates are required when company GPS policy is mandatory; optional when GPS is off.
 */
public record ClockRequest(
        Double latitude,
        Double longitude,
        Double accuracyMetres,
        OffsetDateTime clientCapturedAt,
        UUID workplaceId,
        AttendanceSessionEntity.WorkMode workMode
) {}
