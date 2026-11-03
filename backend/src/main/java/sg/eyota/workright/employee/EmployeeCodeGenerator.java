package sg.eyota.workright.employee;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Concurrency-safe EYB series generator: EYB01, EYB02, … (zero-padded to at least 2 digits).
 * Never reuses values. Gaps after rolled-back transactions are acceptable.
 */
@Component
public class EmployeeCodeGenerator {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public String nextCode() {
        Object next = entityManager.createNativeQuery(
                        "UPDATE employee_code_sequence SET next_value = next_value + 1, updated_at = NOW() "
                                + "WHERE id = 1 RETURNING next_value - 1")
                .getSingleResult();
        long value = ((Number) next).longValue();
        return formatCode(value);
    }

    static String formatCode(long value) {
        if (value < 0) {
            throw new IllegalArgumentException("Employee sequence value must be non-negative");
        }
        return String.format("EYB%02d", value);
    }
}
