-- EYB sequence, extended employee/payroll fields, activation tokens, leave master defaults

-- Employment status: Pending is distinct from login activation
DO $$ BEGIN
    ALTER TYPE employment_status ADD VALUE 'PENDING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE employment_status ADD VALUE 'ON_LEAVE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE employment_type ADD VALUE 'TEMPORARY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS employee_code_sequence (
    id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    next_value  BIGINT NOT NULL DEFAULT 1,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO employee_code_sequence (id, next_value)
VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- Sync sequence past any existing EYB* codes so we never reuse
DO $$
DECLARE
    max_n BIGINT;
BEGIN
    SELECT COALESCE(MAX(
        CASE WHEN employee_code ~ '^EYB[0-9]+$'
             THEN CAST(SUBSTRING(employee_code FROM 4) AS BIGINT)
             ELSE 0 END
    ), 0) INTO max_n FROM employees;
    UPDATE employee_code_sequence SET next_value = GREATEST(next_value, max_n + 1), updated_at = NOW()
    WHERE id = 1;
END $$;

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS gender VARCHAR(32),
    ADD COLUMN IF NOT EXISTS nationality VARCHAR(128),
    ADD COLUMN IF NOT EXISTS residential_address TEXT,
    ADD COLUMN IF NOT EXISTS alternative_contact VARCHAR(32),
    ADD COLUMN IF NOT EXISTS work_pass_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS work_pass_number VARCHAR(128),
    ADD COLUMN IF NOT EXISTS work_pass_expiry DATE,
    ADD COLUMN IF NOT EXISTS fin_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS passport_number VARCHAR(64),
    ADD COLUMN IF NOT EXISTS passport_expiry DATE,
    ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(32),
    ADD COLUMN IF NOT EXISTS bank_account_number_masked VARCHAR(64),
    ADD COLUMN IF NOT EXISTS basic_pay NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS salary_period VARCHAR(32),
    ADD COLUMN IF NOT EXISTS allowances_total NUMERIC(14, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payroll_start_date DATE,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'SGD',
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES app_users (id),
    ADD COLUMN IF NOT EXISTS invitation_email_status VARCHAR(32) DEFAULT 'NOT_SENT';

CREATE TABLE IF NOT EXISTS employee_salary_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees (id),
    basic_pay       NUMERIC(14, 2) NOT NULL,
    overtime_rate   NUMERIC(14, 2),
    allowances_total NUMERIC(14, 2) DEFAULT 0,
    salary_period   VARCHAR(32),
    payment_mode    VARCHAR(32),
    currency        VARCHAR(3) NOT NULL DEFAULT 'SGD',
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    changed_by      UUID REFERENCES app_users (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_history_employee ON employee_salary_history (employee_id);

CREATE TABLE IF NOT EXISTS account_activation_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES app_users (id),
    invitation_id   UUID NOT NULL REFERENCES employee_invitations (id),
    token_hash      VARCHAR(256) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activation_tokens_user ON account_activation_tokens (user_id);

CREATE TABLE IF NOT EXISTS leave_configurations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                        VARCHAR(64) NOT NULL UNIQUE,
    name                        VARCHAR(128) NOT NULL,
    annual_days                 NUMERIC(6, 2) NOT NULL,
    notes                       TEXT,
    statutory_review_flag       BOOLEAN NOT NULL DEFAULT FALSE,
    active                      BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by                  UUID REFERENCES app_users (id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO leave_configurations (code, name, annual_days, notes, statutory_review_flag)
VALUES
    ('ANNUAL', 'Paid Annual Leave Per Year', 7, 'Company default — verify against Singapore EA eligibility before production.', FALSE),
    ('SICK', 'Paid Sick Leave Per Year', 7, 'FLAG FOR REVIEW: confirm outpatient sick-leave entitlement vs Singapore requirements before production.', TRUE),
    ('HOSPITALISATION', 'Paid Hospitalisation Leave Per Year', 60, 'Company default — confirm relationship with outpatient sick leave under applicable rules.', FALSE)
ON CONFLICT (code) DO NOTHING;

-- Invitation delivery tracking
ALTER TABLE employee_invitations
    ADD COLUMN IF NOT EXISTS email_delivery_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS email_error TEXT,
    ADD COLUMN IF NOT EXISTS otp_used_at TIMESTAMPTZ;
