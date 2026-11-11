package sg.eyota.workright.onboarding.entity;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import sg.eyota.workright.common.persistence.AuditedEntity;

@Entity
@Table(name = "arrival_records")
public class ArrivalRecordEntity extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "employee_id", nullable = false, unique = true)
    private UUID employeeId;

    @Column(name = "onboarding_id", nullable = false, unique = true)
    private UUID onboardingId;

    @Column(name = "planned_arrival_date")
    private LocalDate plannedArrivalDate;

    @Column(name = "actual_arrival_date")
    private LocalDate actualArrivalDate;

    @Column(name = "flight_number")
    private String flightNumber;

    @Column(name = "arrival_airport")
    private String arrivalAirport;

    @Column(name = "accommodation_address")
    private String accommodationAddress;

    @Column(name = "housing_confirmed", nullable = false)
    private boolean housingConfirmed;

    @Column(name = "bond_arranged", nullable = false)
    private boolean bondArranged;

    @Column(name = "insurance_arranged", nullable = false)
    private boolean insuranceArranged;

    @Column(name = "employee_confirmed", nullable = false)
    private boolean employeeConfirmed;

    private String notes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getEmployeeId() { return employeeId; }
    public void setEmployeeId(UUID employeeId) { this.employeeId = employeeId; }
    public UUID getOnboardingId() { return onboardingId; }
    public void setOnboardingId(UUID onboardingId) { this.onboardingId = onboardingId; }
    public LocalDate getPlannedArrivalDate() { return plannedArrivalDate; }
    public void setPlannedArrivalDate(LocalDate plannedArrivalDate) { this.plannedArrivalDate = plannedArrivalDate; }
    public LocalDate getActualArrivalDate() { return actualArrivalDate; }
    public void setActualArrivalDate(LocalDate actualArrivalDate) { this.actualArrivalDate = actualArrivalDate; }
    public String getFlightNumber() { return flightNumber; }
    public void setFlightNumber(String flightNumber) { this.flightNumber = flightNumber; }
    public String getArrivalAirport() { return arrivalAirport; }
    public void setArrivalAirport(String arrivalAirport) { this.arrivalAirport = arrivalAirport; }
    public String getAccommodationAddress() { return accommodationAddress; }
    public void setAccommodationAddress(String accommodationAddress) {
        this.accommodationAddress = accommodationAddress;
    }
    public boolean isHousingConfirmed() { return housingConfirmed; }
    public void setHousingConfirmed(boolean housingConfirmed) { this.housingConfirmed = housingConfirmed; }
    public boolean isBondArranged() { return bondArranged; }
    public void setBondArranged(boolean bondArranged) { this.bondArranged = bondArranged; }
    public boolean isInsuranceArranged() { return insuranceArranged; }
    public void setInsuranceArranged(boolean insuranceArranged) { this.insuranceArranged = insuranceArranged; }
    public boolean isEmployeeConfirmed() { return employeeConfirmed; }
    public void setEmployeeConfirmed(boolean employeeConfirmed) { this.employeeConfirmed = employeeConfirmed; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
