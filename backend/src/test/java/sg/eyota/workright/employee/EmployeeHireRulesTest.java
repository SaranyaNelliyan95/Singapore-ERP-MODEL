package sg.eyota.workright.employee;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import sg.eyota.workright.common.exception.ApiException;

class EmployeeHireRulesTest {

    @Test
    void bankingRequiresBankFields() {
        assertThrows(ApiException.class,
                () -> EmployeeHireRules.validateBanking("BANKING", null, "1234567890"));
        assertThrows(ApiException.class,
                () -> EmployeeHireRules.validateBanking("BANKING", "DBS", null));
        assertDoesNotThrow(() -> EmployeeHireRules.validateBanking("IN_HAND", null, null));
    }

    @Test
    void defaultsPaymentAndSalaryPeriod() {
        assertEquals("BANKING", EmployeeHireRules.normalizePaymentMode(null));
        assertEquals("MONTHLY", EmployeeHireRules.normalizeSalaryPeriod(null));
    }

    @Test
    void rejectsNegativeBasicPay() {
        assertThrows(ApiException.class, () -> EmployeeHireRules.requireBasicPay(null));
        assertThrows(ApiException.class, () -> EmployeeHireRules.requireBasicPay(new BigDecimal("-1")));
    }

    @Test
    void requiresValidFin() {
        assertEquals("S1234567A", EmployeeHireRules.requireFin("s1234567a"));
        assertThrows(ApiException.class, () -> EmployeeHireRules.requireFin(""));
        assertThrows(ApiException.class, () -> EmployeeHireRules.requireFin("123"));
    }
}
