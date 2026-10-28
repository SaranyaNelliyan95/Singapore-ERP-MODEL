package sg.eyota.workright.attendance.dto;

import java.time.LocalDate;
import java.util.UUID;

import sg.eyota.workright.attendance.entity.WorkplaceEntity;

public record WorkplaceDto(
        UUID id,
        String code,
        String name,
        String address,
        double latitude,
        double longitude,
        int radiusMetres,
        boolean active,
        WorkplaceEntity.GpsPolicy gpsPolicy,
        boolean wfhAllowed,
        LocalDate effectiveFrom,
        LocalDate effectiveTo
) {
    public static WorkplaceDto from(WorkplaceEntity w) {
        return new WorkplaceDto(
                w.getId(),
                w.getCode(),
                w.getName(),
                w.getAddress(),
                w.getLatitude(),
                w.getLongitude(),
                w.getRadiusMetres(),
                w.isActive(),
                w.getGpsPolicy(),
                w.isWfhAllowed(),
                w.getEffectiveFrom(),
                w.getEffectiveTo()
        );
    }
}
