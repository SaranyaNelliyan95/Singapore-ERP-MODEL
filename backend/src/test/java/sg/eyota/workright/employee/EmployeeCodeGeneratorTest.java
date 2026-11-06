package sg.eyota.workright.employee;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class EmployeeCodeGeneratorTest {

    @Test
    void formatsZeroPaddedSeries() {
        assertEquals("EYB01", EmployeeCodeGenerator.formatCode(1));
        assertEquals("EYB02", EmployeeCodeGenerator.formatCode(2));
        assertEquals("EYB09", EmployeeCodeGenerator.formatCode(9));
        assertEquals("EYB10", EmployeeCodeGenerator.formatCode(10));
        assertEquals("EYB100", EmployeeCodeGenerator.formatCode(100));
    }
}
