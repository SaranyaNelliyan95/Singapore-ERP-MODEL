package sg.eyota.workright.employee.dto;

import java.time.LocalDate;

public record EmployeeProfileUpdateRequest(
        LocalDate dateOfBirth,
        String gender,
        String nationality,
        String residentialAddress,
        String mobile,
        String alternativeContact,
        String passportNumber,
        LocalDate passportExpiry
) {}
