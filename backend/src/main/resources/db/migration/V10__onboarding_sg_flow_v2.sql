-- Singapore onboarding SG-flow v2 (additive / nullable — existing rows keep loading)

-- Medical Fit/Unfit outcomes (keeps PENDING / COMPLETED / NOT_APPLICABLE)
DO $$ BEGIN
    ALTER TYPE programme_outcome ADD VALUE IF NOT EXISTS 'FIT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE programme_outcome ADD VALUE IF NOT EXISTS 'UNFIT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE arrival_records
    ADD COLUMN IF NOT EXISTS accommodation_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS dorm_capacity INT,
    ADD COLUMN IF NOT EXISTS mom_address_registered BOOLEAN,
    ADD COLUMN IF NOT EXISTS pcp_recorded BOOLEAN,
    ADD COLUMN IF NOT EXISTS medical_insurance_recorded BOOLEAN,
    ADD COLUMN IF NOT EXISTS security_bond_purchased BOOLEAN;

ALTER TABLE work_pass_records
    ADD COLUMN IF NOT EXISTS ipa_extension_requested BOOLEAN,
    ADD COLUMN IF NOT EXISTS tp_number VARCHAR(128),
    ADD COLUMN IF NOT EXISTS tp_issue_date DATE,
    ADD COLUMN IF NOT EXISTS tp_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS tp_valid BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE candidate_onboarding
    ADD COLUMN IF NOT EXISTS construction_safety_status programme_outcome NOT NULL DEFAULT 'NOT_APPLICABLE',
    ADD COLUMN IF NOT EXISTS sg_flow_v2_tasks_seeded BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE onboarding_tasks
    ADD COLUMN IF NOT EXISTS applies BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS warning_text TEXT;
