package sg.eyota.workright.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;
import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;

public record ClockRequest(
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Double accuracyMetres,
        OffsetDateTime clientCapturedAt,
        UUID workplaceId,
        AttendanceSessionEntity.WorkMode workMode
) {}
