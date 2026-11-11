package sg.eyota.workright.payroll;

import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/hr/employees")
@PreAuthorize("hasAnyRole('HR','ADMIN')")
public class PayrollReadinessController {

    private final PayrollReadinessService payrollReadinessService;

    public PayrollReadinessController(PayrollReadinessService payrollReadinessService) {
        this.payrollReadinessService = payrollReadinessService;
    }

    @GetMapping("/{id}/payroll-readiness")
    public PayrollReadinessService.PayrollReadinessResponse readiness(@PathVariable UUID id) {
        return payrollReadinessService.assess(id);
    }
}
