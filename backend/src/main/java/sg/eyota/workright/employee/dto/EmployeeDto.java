package sg.eyota.workright.employee.dto;

import java.time.LocalDate;
import java.util.UUID;

import sg.eyota.workright.employee.entity.EmployeeEntity;

public record EmployeeDto(
        UUID id,
        String employeeCode,
        String fullName,
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
        boolean active
) {
    public static EmployeeDto from(EmployeeEntity e) {
        return new EmployeeDto(
                e.getId(),
                e.getEmployeeCode(),
                e.getFullName(),
                e.getDepartment(),
                e.getDesignation(),
                e.getEmploymentType(),
                e.getEmploymentStatus(),
                e.getWorkLocationMode(),
                e.getWorkplaceId(),
                e.getManagerEmployeeId(),
                e.getDateOfJoining(),
                e.getMobile(),
                e.getPersonalEmail(),
                e.isActive()
        );
    }
}
