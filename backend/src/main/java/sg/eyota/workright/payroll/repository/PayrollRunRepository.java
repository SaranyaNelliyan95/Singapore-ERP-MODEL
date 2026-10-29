package sg.eyota.workright.payroll.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.payroll.entity.PayrollRunEntity;

public interface PayrollRunRepository extends JpaRepository<PayrollRunEntity, UUID> {

    List<PayrollRunEntity> findByPayrollPeriodId(UUID payrollPeriodId);
}
