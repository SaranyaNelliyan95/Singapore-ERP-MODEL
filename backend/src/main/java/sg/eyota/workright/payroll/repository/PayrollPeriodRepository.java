package sg.eyota.workright.payroll.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import sg.eyota.workright.payroll.entity.PayrollPeriodEntity;

public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriodEntity, UUID> {}
