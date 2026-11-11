package sg.eyota.workright.attendance;

import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;
import sg.eyota.workright.attendance.entity.WorkplaceEntity;

public final class AttendanceGeofenceEvaluator {

    public record GeofenceEvaluation(
            AttendanceSessionEntity.GeofenceResult result,
            double distanceMetres,
            boolean rejected
    ) {}

    private AttendanceGeofenceEvaluator() {}

    public static GeofenceEvaluation evaluate(
            WorkplaceEntity workplace,
            double latitude,
            double longitude,
            AttendanceSessionEntity.WorkMode workMode
    ) {
        if (workMode == AttendanceSessionEntity.WorkMode.WFH) {
            if (!workplace.isWfhAllowed()) {
                return new GeofenceEvaluation(AttendanceSessionEntity.GeofenceResult.OUTSIDE, 0, true);
            }
            return new GeofenceEvaluation(AttendanceSessionEntity.GeofenceResult.SKIPPED, 0, false);
        }
        if (workplace.getGpsPolicy() == WorkplaceEntity.GpsPolicy.DISABLED) {
            return new GeofenceEvaluation(AttendanceSessionEntity.GeofenceResult.SKIPPED, 0, false);
        }
        double distance = GeoUtils.haversineMetres(
                latitude, longitude, workplace.getLatitude(), workplace.getLongitude());
        boolean inside = distance <= workplace.getRadiusMetres();
        AttendanceSessionEntity.GeofenceResult result = inside
                ? AttendanceSessionEntity.GeofenceResult.INSIDE
                : AttendanceSessionEntity.GeofenceResult.OUTSIDE;
        boolean rejected = !inside && workplace.getGpsPolicy() == WorkplaceEntity.GpsPolicy.MANDATORY;
        return new GeofenceEvaluation(result, distance, rejected);
    }
}
