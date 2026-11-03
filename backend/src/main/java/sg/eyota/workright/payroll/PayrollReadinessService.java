package sg.eyota.workright.payroll;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;

@Service
public class PayrollReadinessService {

    private final EmployeeRepository employeeRepository;

    public PayrollReadinessService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    public record PayrollReadinessResponse(
            UUID employeeId,
            String employeeCode,
            boolean ready,
            List<String> missingFields,
            String message
    ) {}

    @Transactional(readOnly = true)
    public PayrollReadinessResponse assess(UUID employeeId) {
        EmployeeEntity e = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Employee not found"));

        List<String> missing = new ArrayList<>();
        if (e.getEmploymentStatus() == EmployeeEntity.EmploymentStatus.RESIGNED
                || e.getEmploymentStatus() == EmployeeEntity.EmploymentStatus.TERMINATED) {
            missing.add("Employment status does not allow payroll (" + e.getEmploymentStatus() + ")");
        }
        if (e.getBasicPay() == null || e.getBasicPay().compareTo(BigDecimal.ZERO) <= 0) {
            missing.add("Basic pay must be greater than zero");
        }
        if (e.getSalaryPeriod() == null || e.getSalaryPeriod().isBlank()) {
            missing.add("Salary period is required");
        }
        if (e.getPayrollStartDate() == null) {
            missing.add("Payroll start date is required");
        }
        if (e.getPaymentMode() == null || e.getPaymentMode().isBlank()) {
            missing.add("Payment mode is required (BANKING or IN_HAND)");
        } else if ("BANKING".equalsIgnoreCase(e.getPaymentMode())) {
            if (e.getBankName() == null || e.getBankName().isBlank()) {
                missing.add("Bank name is required for Banking payment mode");
            }
            String acct = e.getBankAccountNumberMasked() != null ? e.getBankAccountNumberMasked() : e.getBankAccountMasked();
            if (acct == null || acct.isBlank()) {
                missing.add("Bank account number is required for Banking payment mode");
            }
        }
        if (e.getAllowancesTotal() != null && e.getAllowancesTotal().compareTo(BigDecimal.ZERO) < 0) {
            missing.add("Allowances cannot be negative");
        }
        if (e.getOvertimeRate() != null && e.getOvertimeRate().compareTo(BigDecimal.ZERO) < 0) {
            missing.add("Overtime rate cannot be negative");
        }

        boolean ready = missing.isEmpty();
        return new PayrollReadinessResponse(
                e.getId(),
                e.getEmployeeCode(),
                ready,
                missing,
                ready
                        ? "Employee is ready for payslip generation (statutory rates still require configured rules)."
                        : "Payroll cannot start until the listed fields are completed."
        );
    }
}
