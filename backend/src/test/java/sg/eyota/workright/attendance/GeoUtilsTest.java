package sg.eyota.workright.attendance;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class GeoUtilsTest {

    @Test
    void haversine_samePoint_isZero() {
        assertEquals(0d, GeoUtils.haversineMetres(1.2916, 103.7803, 1.2916, 103.7803), 0.5);
    }

    @Test
    void haversine_knownDistance_approxOneKm() {
        // ~1 km north at equator (1 degree lat ≈ 111km; 0.009° ≈ 1km)
        double metres = GeoUtils.haversineMetres(1.0, 103.0, 1.009, 103.0);
        assertEquals(1000d, metres, 50d);
    }

    @Test
    void haversine_singaporeHqToNearbyPoint() {
        double hqLat = 1.2916;
        double hqLng = 103.7803;
        double nearLat = 1.2920;
        double nearLng = 103.7808;
        double d = GeoUtils.haversineMetres(hqLat, hqLng, nearLat, nearLng);
        assertEquals(70d, d, 40d);
    }
}
