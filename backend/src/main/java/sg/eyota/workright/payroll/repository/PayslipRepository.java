package sg.eyota.workright.payroll.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.payroll.entity.PayslipEntity;

public interface PayslipRepository extends JpaRepository<PayslipEntity, UUID> {

    List<PayslipEntity> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId);

    List<PayslipEntity> findByPayrollRunId(UUID payrollRunId);
}
