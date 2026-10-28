package sg.eyota.workright.attendance.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;

public record AttendanceCorrectionRequest(
        Instant clockInAt,
        Instant clockOutAt,
        @NotBlank String correctionReason
) {}
