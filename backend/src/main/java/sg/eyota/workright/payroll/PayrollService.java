package sg.eyota.workright.payroll;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sg.eyota.workright.common.exception.ApiException;
import sg.eyota.workright.payroll.entity.PayrollPeriodEntity;
import sg.eyota.workright.payroll.entity.PayrollRunEntity;
import sg.eyota.workright.payroll.entity.PayslipEntity;
import sg.eyota.workright.payroll.repository.PayrollPeriodRepository;
import sg.eyota.workright.payroll.repository.PayrollRunRepository;
import sg.eyota.workright.payroll.repository.PayslipRepository;

@Service
public class PayrollService {

    private final PayrollPeriodRepository periodRepository;
    private final PayrollRunRepository runRepository;
    private final PayslipRepository payslipRepository;
    private final Clock clock;

    public PayrollService(
            PayrollPeriodRepository periodRepository,
            PayrollRunRepository runRepository,
            PayslipRepository payslipRepository,
            Clock clock
    ) {
        this.periodRepository = periodRepository;
        this.runRepository = runRepository;
        this.payslipRepository = payslipRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<PayrollPeriodEntity> listPeriods() {
        return periodRepository.findAll();
    }

    @Transactional
    public PayrollPeriodEntity createPeriod(PayrollPeriodEntity period) {
        return periodRepository.save(period);
    }

    @Transactional
    public PayrollRunEntity createRun(PayrollRunEntity run) {
        run.setStatus(PayrollRunEntity.Status.DRAFT);
        return runRepository.save(run);
    }

    @Transactional
    public PayrollRunEntity processRun(UUID runId) {
        PayrollRunEntity run = runRepository.findById(runId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Not Found", "Payroll run not found"));
        run.setStatus(PayrollRunEntity.Status.COMPLETED);
        run.setProcessedAt(Instant.now(clock));
        return runRepository.save(run);
    }

    @Transactional(readOnly = true)
    public List<PayslipEntity> myPayslips(UUID employeeId) {
        return payslipRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }

    @Transactional
    public PayslipEntity createPayslip(PayslipEntity payslip) {
        return payslipRepository.save(payslip);
    }
}
