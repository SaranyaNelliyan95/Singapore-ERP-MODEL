package sg.eyota.workright.payroll;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sg.eyota.workright.payroll.entity.PayrollPeriodEntity;
import sg.eyota.workright.payroll.entity.PayrollRunEntity;
import sg.eyota.workright.payroll.entity.PayslipEntity;
import sg.eyota.workright.security.SecurityUtils;

@RestController
@RequestMapping("/api/v1/payroll")
public class PayrollController {

    private final PayrollService payrollService;

    public PayrollController(PayrollService payrollService) {
        this.payrollService = payrollService;
    }

    @GetMapping("/periods")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public List<PayrollPeriodEntity> periods() {
        return payrollService.listPeriods();
    }

    @PostMapping("/periods")
    @PreAuthorize("hasRole('ADMIN')")
    public PayrollPeriodEntity createPeriod(@RequestBody PayrollPeriodEntity period) {
        return payrollService.createPeriod(period);
    }

    @PostMapping("/runs")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public PayrollRunEntity createRun(@RequestBody PayrollRunEntity run) {
        return payrollService.createRun(run);
    }

    @PostMapping("/runs/{id}/process")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public PayrollRunEntity processRun(@PathVariable UUID id) {
        return payrollService.processRun(id);
    }

    @GetMapping("/payslips/me")
    public List<PayslipEntity> myPayslips() {
        return payrollService.myPayslips(SecurityUtils.currentUser().getUser().getEmployeeId());
    }

    @PostMapping("/payslips")
    @PreAuthorize("hasAnyRole('HR','ADMIN')")
    public PayslipEntity createPayslip(@RequestBody PayslipEntity payslip) {
        return payrollService.createPayslip(payslip);
    }
}
