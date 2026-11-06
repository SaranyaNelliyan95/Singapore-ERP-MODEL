-- Unique login/contact email on employees (NULLs allowed for legacy rows)
CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_personal_email_lower
    ON employees (LOWER(personal_email))
    WHERE personal_email IS NOT NULL AND BTRIM(personal_email) <> '';

-- Keep EYB sequence ahead of any existing codes (EYB1, EYB01, EYB12, …)
DO $$
DECLARE
    max_n BIGINT;
BEGIN
    SELECT COALESCE(MAX(
        CASE
            WHEN employee_code ~ '^EYB[0-9]+$'
                THEN CAST(SUBSTRING(employee_code FROM 4) AS BIGINT)
            ELSE 0
        END
    ), 0) INTO max_n FROM employees;
    UPDATE employee_code_sequence
    SET next_value = GREATEST(next_value, max_n + 1), updated_at = NOW()
    WHERE id = 1;
END $$;
