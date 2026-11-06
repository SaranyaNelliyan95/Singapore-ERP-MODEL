package sg.eyota.workright.attendance;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import sg.eyota.workright.attendance.entity.AttendanceSessionEntity;
import sg.eyota.workright.attendance.entity.WorkplaceEntity;

class AttendanceGeofencePolicyTest {

    @Test
    void mandatory_insideRadius_notRejected() {
        WorkplaceEntity wp = hqWorkplace(WorkplaceEntity.GpsPolicy.MANDATORY);
        var eval = AttendanceGeofenceEvaluator.evaluate(
                wp, wp.getLatitude(), wp.getLongitude(), AttendanceSessionEntity.WorkMode.OFFICE);
        assertFalse(eval.rejected());
    }

    @Test
    void mandatory_farOutside_rejected() {
        WorkplaceEntity wp = hqWorkplace(WorkplaceEntity.GpsPolicy.MANDATORY);
        var eval = AttendanceGeofenceEvaluator.evaluate(
                wp, 1.35, 103.85, AttendanceSessionEntity.WorkMode.OFFICE);
        assertTrue(eval.rejected());
    }

    @Test
    void optional_outside_notRejected() {
        WorkplaceEntity wp = hqWorkplace(WorkplaceEntity.GpsPolicy.OPTIONAL);
        var eval = AttendanceGeofenceEvaluator.evaluate(
                wp, 1.35, 103.85, AttendanceSessionEntity.WorkMode.OFFICE);
        assertFalse(eval.rejected());
    }

    @Test
    void wfh_skipped_whenAllowed() {
        WorkplaceEntity wp = hqWorkplace(WorkplaceEntity.GpsPolicy.MANDATORY);
        wp.setWfhAllowed(true);
        var eval = AttendanceGeofenceEvaluator.evaluate(
                wp, 0, 0, AttendanceSessionEntity.WorkMode.WFH);
        assertFalse(eval.rejected());
    }

    @Test
    void wfh_rejected_whenNotAllowed() {
        WorkplaceEntity wp = hqWorkplace(WorkplaceEntity.GpsPolicy.MANDATORY);
        wp.setWfhAllowed(false);
        var eval = AttendanceGeofenceEvaluator.evaluate(
                wp, 0, 0, AttendanceSessionEntity.WorkMode.WFH);
        assertTrue(eval.rejected());
    }

    private static WorkplaceEntity hqWorkplace(WorkplaceEntity.GpsPolicy policy) {
        WorkplaceEntity wp = new WorkplaceEntity();
        wp.setLatitude(1.2916);
        wp.setLongitude(103.7803);
        wp.setRadiusMetres(200);
        wp.setGpsPolicy(policy);
        wp.setWfhAllowed(true);
        return wp;
    }
}
