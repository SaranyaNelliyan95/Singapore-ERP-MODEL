package sg.eyota.workright.employee.dto;

import java.math.BigDecimal;
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
        LocalDate probationEnd,
        String mobile,
        String personalEmail,
        LocalDate dateOfBirth,
        String gender,
        String nationality,
        String residentialAddress,
        String alternativeContact,
        String workPassType,
        String workPassNumber,
        LocalDate workPassExpiry,
        String finNumber,
        String passportNumber,
        LocalDate passportExpiry,
        String paymentMode,
        String bankName,
        String bankAccountMasked,
        BigDecimal basicPay,
        BigDecimal overtimeRate,
        String salaryPeriod,
        BigDecimal allowancesTotal,
        LocalDate payrollStartDate,
        String currency,
        String invitationEmailStatus,
        String accountStatus,
        boolean active
) {
    public static EmployeeDto from(EmployeeEntity e) {
        return from(e, null);
    }

    /**
     * @param accountActive login flag from linked {@code app_users.active}; null when unknown
     */
    public static EmployeeDto from(EmployeeEntity e, Boolean accountActive) {
        boolean loginActive = accountActive != null ? accountActive : e.isActive();
        String invitation = e.getInvitationEmailStatus();
        String accountStatus;
        if (accountActive == null) {
            accountStatus = "ACCEPTED".equalsIgnoreCase(invitation) ? "ACTIVE" : "INVITATION_PENDING";
        } else if (loginActive) {
            accountStatus = "ACTIVE";
        } else if (invitation != null && !"ACCEPTED".equalsIgnoreCase(invitation)) {
            accountStatus = "INVITATION_PENDING";
        } else {
            accountStatus = "INACTIVE";
        }
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
                e.getProbationEnd(),
                e.getMobile(),
                e.getPersonalEmail(),
                e.getDateOfBirth(),
                e.getGender(),
                e.getNationality(),
                e.getResidentialAddress(),
                e.getAlternativeContact(),
                e.getWorkPassType(),
                e.getWorkPassNumber(),
                e.getWorkPassExpiry(),
                e.getFinNumber(),
                e.getPassportNumber(),
                e.getPassportExpiry(),
                e.getPaymentMode(),
                e.getBankName(),
                e.getBankAccountNumberMasked() != null ? e.getBankAccountNumberMasked() : e.getBankAccountMasked(),
                e.getBasicPay(),
                e.getOvertimeRate(),
                e.getSalaryPeriod(),
                e.getAllowancesTotal(),
                e.getPayrollStartDate(),
                e.getCurrency(),
                e.getInvitationEmailStatus(),
                accountStatus,
                loginActive
        );
    }
}
