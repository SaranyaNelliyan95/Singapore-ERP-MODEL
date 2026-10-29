package sg.eyota.workright.attendance.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import sg.eyota.workright.attendance.entity.WorkplaceEntity;

public record WorkplaceUpsertRequest(
        @NotBlank String code,
        @NotBlank String name,
        String address,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Integer radiusMetres,
        Boolean active,
        WorkplaceEntity.GpsPolicy gpsPolicy,
        Boolean wfhAllowed,
        LocalDate effectiveFrom,
        LocalDate effectiveTo
) {}
