package sg.eyota.workright.enrollment.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import sg.eyota.workright.employee.entity.EmployeeEntity;

public record EnrollEmployeeRequest(
        @NotBlank @Size(max = 32) String employeeCode,
        @NotBlank @Size(max = 256) String fullName,
        @NotBlank @Email @Size(max = 256) String workEmail,
        String department,
        String designation,
        EmployeeEntity.EmploymentType employmentType,
        EmployeeEntity.EmploymentStatus employmentStatus,
        EmployeeEntity.WorkLocationMode workLocationMode,
        UUID workplaceId,
        UUID managerEmployeeId,
        LocalDate dateOfJoining,
        String mobile
) {}
