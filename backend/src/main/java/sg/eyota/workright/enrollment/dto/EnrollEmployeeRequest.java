package sg.eyota.workright.enrollment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import sg.eyota.workright.employee.entity.EmployeeEntity;

/**
 * Full HR new-hire / add-employee payload. Employee ID is never accepted from the client.
 */
public record EnrollEmployeeRequest(
        @NotBlank @Size(max = 256) String fullName,
        @NotBlank @Email @Size(max = 256) String email,
        @NotBlank @Size(max = 32) String mobile,
        @NotBlank @Size(max = 128) String designation,
        @NotNull EmployeeEntity.EmploymentType employmentType,
        @NotNull LocalDate dateOfJoining,

        @NotNull LocalDate dateOfBirth,
        @NotBlank @Size(max = 32) String gender,
        @NotBlank @Size(max = 128) String nationality,
        @NotBlank @Size(max = 512) String residentialAddress,
        @NotBlank @Size(max = 64) String finNumber,

        String department,
        String alternativeContact,
        EmployeeEntity.EmploymentStatus employmentStatus,
        LocalDate probationEnd,
        UUID managerEmployeeId,
        String workPassType,
        String workPassNumber,
        LocalDate workPassExpiry,
        String passportNumber,
        LocalDate passportExpiry,

        String paymentMode,
        String bankName,
        String bankAccountNumber,
        @NotNull @DecimalMin("0.0") BigDecimal basicPay,
        @DecimalMin("0.0") BigDecimal overtimeRate,
        String salaryPeriod,
        @DecimalMin("0.0") BigDecimal allowancesTotal,
        LocalDate payrollStartDate
) {}
