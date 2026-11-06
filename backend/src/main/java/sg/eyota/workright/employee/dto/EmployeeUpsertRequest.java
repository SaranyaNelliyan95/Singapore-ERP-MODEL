package sg.eyota.workright.employee.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import sg.eyota.workright.employee.entity.EmployeeEntity;

public record EmployeeUpsertRequest(
        @NotBlank String employeeCode,
        @NotBlank String fullName,
        String department,
        String designation,
        EmployeeEntity.EmploymentType employmentType,
        EmployeeEntity.EmploymentStatus employmentStatus,
        EmployeeEntity.WorkLocationMode workLocationMode,
        UUID workplaceId,
        UUID managerEmployeeId,
        LocalDate dateOfJoining,
        String mobile,
        String personalEmail,
        Boolean active
) {}
