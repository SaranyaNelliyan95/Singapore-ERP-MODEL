-- HR onboarding pipeline stages (corporate new-hire tracker)
DO $$ BEGIN
    CREATE TYPE onboarding_stage AS ENUM (
        'OFFER',
        'MOM_FORMS',
        'MEDICAL',
        'ORIENTATION',
        'COMPLETED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS onboarding_stage onboarding_stage,
    ADD COLUMN IF NOT EXISTS onboarding_progress INT NOT NULL DEFAULT 0;

-- Backfill: pending / invitation-open hires start in Offer; everyone else completed
UPDATE employees
SET onboarding_stage = 'OFFER',
    onboarding_progress = 10
WHERE onboarding_stage IS NULL
  AND employment_status = 'PENDING';

UPDATE employees
SET onboarding_stage = 'ORIENTATION',
    onboarding_progress = 85
WHERE onboarding_stage IS NULL
  AND employment_status = 'PROBATION'
  AND COALESCE(invitation_email_status, 'NOT_SENT') <> 'ACCEPTED';

UPDATE employees
SET onboarding_stage = 'COMPLETED',
    onboarding_progress = 100
WHERE onboarding_stage IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_onboarding_stage
    ON employees (onboarding_stage)
    WHERE onboarding_stage IS DISTINCT FROM 'COMPLETED';
