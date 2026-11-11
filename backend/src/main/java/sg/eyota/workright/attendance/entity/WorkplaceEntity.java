package sg.eyota.workright.attendance.entity;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import sg.eyota.workright.common.persistence.AuditedEntity;

@Entity
@Table(name = "workplaces")
public class WorkplaceEntity extends AuditedEntity {

    public enum GpsPolicy { MANDATORY, OPTIONAL, DISABLED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String address;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(name = "radius_metres", nullable = false)
    private int radiusMetres;

    @Column(nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "gps_policy", columnDefinition = "gps_policy")
    private GpsPolicy gpsPolicy = GpsPolicy.MANDATORY;

    @Column(name = "wfh_allowed", nullable = false)
    private boolean wfhAllowed;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public int getRadiusMetres() {
        return radiusMetres;
    }

    public void setRadiusMetres(int radiusMetres) {
        this.radiusMetres = radiusMetres;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public GpsPolicy getGpsPolicy() {
        return gpsPolicy;
    }

    public void setGpsPolicy(GpsPolicy gpsPolicy) {
        this.gpsPolicy = gpsPolicy;
    }

    public boolean isWfhAllowed() {
        return wfhAllowed;
    }

    public void setWfhAllowed(boolean wfhAllowed) {
        this.wfhAllowed = wfhAllowed;
    }

    public LocalDate getEffectiveFrom() {
        return effectiveFrom;
    }

    public void setEffectiveFrom(LocalDate effectiveFrom) {
        this.effectiveFrom = effectiveFrom;
    }

    public LocalDate getEffectiveTo() {
        return effectiveTo;
    }

    public void setEffectiveTo(LocalDate effectiveTo) {
        this.effectiveTo = effectiveTo;
    }
}
