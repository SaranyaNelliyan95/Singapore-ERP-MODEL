package sg.eyota.workright.payroll;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sg.eyota.workright.employee.entity.EmployeeEntity;
import sg.eyota.workright.employee.repository.EmployeeRepository;

@ExtendWith(MockitoExtension.class)
class PayrollReadinessServiceTest {

    @Mock
    EmployeeRepository employeeRepository;

    PayrollReadinessService service;

    @BeforeEach
    void setUp() {
        service = new PayrollReadinessService(employeeRepository);
    }

    @Test
    void missingBasicPayPreventsReady() {
        EmployeeEntity e = baseEmployee();
        e.setBasicPay(BigDecimal.ZERO);
        when(employeeRepository.findById(e.getId())).thenReturn(Optional.of(e));

        var result = service.assess(e.getId());
        assertFalse(result.ready());
        assertTrue(result.missingFields().stream().anyMatch(m -> m.contains("Basic pay")));
    }

    @Test
    void bankingRequiresBankDetails() {
        EmployeeEntity e = baseEmployee();
        e.setPaymentMode("BANKING");
        e.setBankName(null);
        e.setBankAccountNumberMasked(null);
        when(employeeRepository.findById(e.getId())).thenReturn(Optional.of(e));

        var result = service.assess(e.getId());
        assertFalse(result.ready());
        assertTrue(result.missingFields().stream().anyMatch(m -> m.contains("Bank")));
    }

    @Test
    void inHandDoesNotRequireBank() {
        EmployeeEntity e = baseEmployee();
        e.setPaymentMode("IN_HAND");
        e.setBankName(null);
        e.setBankAccountNumberMasked(null);
        when(employeeRepository.findById(e.getId())).thenReturn(Optional.of(e));

        var result = service.assess(e.getId());
        assertTrue(result.ready());
    }

    private static EmployeeEntity baseEmployee() {
        EmployeeEntity e = new EmployeeEntity();
        e.setId(UUID.randomUUID());
        e.setEmployeeCode("EYB1");
        e.setFullName("Test User");
        e.setEmploymentStatus(EmployeeEntity.EmploymentStatus.ACTIVE);
        e.setBasicPay(new BigDecimal("3500.00"));
        e.setSalaryPeriod("MONTHLY");
        e.setPayrollStartDate(LocalDate.of(2026, 1, 1));
        e.setPaymentMode("IN_HAND");
        e.setAllowancesTotal(BigDecimal.ZERO);
        return e;
    }
}
