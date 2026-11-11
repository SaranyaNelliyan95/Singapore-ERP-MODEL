-- Foreign employee / work-pass onboarding pipeline (MOM-aligned stages)
-- Extends existing corporate onboarding without removing V8 stages.

DO $$ BEGIN
    CREATE TYPE work_pass_pipeline_status AS ENUM (
        'DRAFT',
        'DOCUMENTS_PENDING',
        'APPLICATION_SUBMITTED',
        'IPA_APPROVED',
        'PRE_ARRIVAL_PENDING',
        'READY_FOR_TRAVEL',
        'ARRIVED_IN_SINGAPORE',
        'POST_ARRIVAL_PENDING',
        'WORK_PERMIT_ISSUED',
        'ONBOARDING_IN_PROGRESS',
        'READY_TO_WORK',
        'CANCELLED',
        'ON_HOLD'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE onboarding_doc_type AS ENUM (
        'PASSPORT',
        'WP_APPLICATION',
        'WP_APPROVAL',
        'IPA_FULL_SET',
        'EMPLOYMENT_CONTRACT',
        'WP_NOTIFICATION',
        'WP_CARD',
        'MEDICAL_CONFIRMATION',
        'SIP_CONFIRMATION',
        'ONBOARD_CONFIRMATION',
        'FLIGHT_ARRIVAL',
        'ACCOMMODATION',
        'PPE_SAFETY_TRAINING',
        'OVERRIDE_EVIDENCE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE onboarding_task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE', 'BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE programme_outcome AS ENUM ('PENDING', 'COMPLETED', 'NOT_APPLICABLE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS pipeline_status work_pass_pipeline_status,
    ADD COLUMN IF NOT EXISTS worker_category VARCHAR(64),
    ADD COLUMN IF NOT EXISTS nationality_code VARCHAR(8),
    ADD COLUMN IF NOT EXISTS sector VARCHAR(128);

UPDATE employees
SET pipeline_status = CASE
    WHEN onboarding_stage = 'OFFER' THEN 'DRAFT'::work_pass_pipeline_status
    WHEN onboarding_stage = 'MOM_FORMS' THEN 'APPLICATION_SUBMITTED'::work_pass_pipeline_status
    WHEN onboarding_stage = 'MEDICAL' THEN 'POST_ARRIVAL_PENDING'::work_pass_pipeline_status
    WHEN onboarding_stage = 'ORIENTATION' THEN 'ONBOARDING_IN_PROGRESS'::work_pass_pipeline_status
    WHEN onboarding_stage = 'COMPLETED' THEN 'READY_TO_WORK'::work_pass_pipeline_status
    ELSE 'DRAFT'::work_pass_pipeline_status
END
WHERE pipeline_status IS NULL;

ALTER TABLE employees
    ALTER COLUMN pipeline_status SET DEFAULT 'DRAFT'::work_pass_pipeline_status;

CREATE TABLE IF NOT EXISTS candidate_onboarding (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL UNIQUE REFERENCES employees (id) ON DELETE CASCADE,
    pipeline_status         work_pass_pipeline_status NOT NULL DEFAULT 'DRAFT',
    pass_type               VARCHAR(64),
    worker_category         VARCHAR(64),
    sector                  VARCHAR(128),
    is_foreign_worker       BOOLEAN NOT NULL DEFAULT FALSE,
    checklist_progress      INT NOT NULL DEFAULT 0,
    medical_status          programme_outcome NOT NULL DEFAULT 'PENDING',
    sip_status              programme_outcome NOT NULL DEFAULT 'PENDING',
    onboard_programme_status programme_outcome NOT NULL DEFAULT 'PENDING',
    quarantine_status       programme_outcome NOT NULL DEFAULT 'NOT_APPLICABLE',
    contract_ack_required   BOOLEAN NOT NULL DEFAULT TRUE,
    ppe_required            BOOLEAN NOT NULL DEFAULT TRUE,
    induction_required      BOOLEAN NOT NULL DEFAULT TRUE,
    ready_blocked_reason    TEXT,
    override_reason         TEXT,
    notes                   TEXT,
    created_by_user_id      UUID REFERENCES app_users (id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_onboarding_status
    ON candidate_onboarding (pipeline_status);

CREATE TABLE IF NOT EXISTS work_pass_applications (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    mom_reference           VARCHAR(128),
    application_type        VARCHAR(64),
    submitted_at            DATE,
    submitted_by_user_id    UUID REFERENCES app_users (id),
    portal_notes            TEXT,
    status                  VARCHAR(64) NOT NULL DEFAULT 'SUBMITTED',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_pass_applications_employee
    ON work_pass_applications (employee_id);

CREATE TABLE IF NOT EXISTS onboarding_documents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    doc_type                onboarding_doc_type NOT NULL DEFAULT 'OTHER',
    file_name               VARCHAR(512) NOT NULL,
    content_type            VARCHAR(128),
    storage_path            VARCHAR(1024) NOT NULL,
    size_bytes              BIGINT,
    issue_date              DATE,
    expiry_date             DATE,
    approval_status         VARCHAR(32) NOT NULL DEFAULT 'UPLOADED',
    version_no              INT NOT NULL DEFAULT 1,
    visibility              VARCHAR(32) NOT NULL DEFAULT 'HR_ADMIN',
    uploaded_by_user_id     UUID REFERENCES app_users (id),
    viewed_by_employee      BOOLEAN NOT NULL DEFAULT FALSE,
    downloaded_by_employee  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_documents_employee
    ON onboarding_documents (employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_type
    ON onboarding_documents (doc_type);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    task_code               VARCHAR(64) NOT NULL,
    title                   VARCHAR(256) NOT NULL,
    stage_gate              work_pass_pipeline_status,
    status                  onboarding_task_status NOT NULL DEFAULT 'PENDING',
    mandatory               BOOLEAN NOT NULL DEFAULT TRUE,
    due_date                DATE,
    completed_at            TIMESTAMPTZ,
    completed_by_user_id    UUID REFERENCES app_users (id),
    notes                   TEXT,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_onboarding_task UNIQUE (onboarding_id, task_code)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_employee
    ON onboarding_tasks (employee_id);

CREATE TABLE IF NOT EXISTS arrival_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL UNIQUE REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL UNIQUE REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    planned_arrival_date    DATE,
    actual_arrival_date     DATE,
    flight_number           VARCHAR(64),
    arrival_airport         VARCHAR(128),
    accommodation_address   TEXT,
    housing_confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
    bond_arranged           BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_arranged      BOOLEAN NOT NULL DEFAULT FALSE,
    employee_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_appointments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    appointment_type        VARCHAR(64) NOT NULL,
    scheduled_at            TIMESTAMPTZ,
    location                VARCHAR(256),
    outcome                 programme_outcome NOT NULL DEFAULT 'PENDING',
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_appointments_employee
    ON onboarding_appointments (employee_id);

CREATE TABLE IF NOT EXISTS work_pass_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL UNIQUE REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL UNIQUE REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    ipa_number              VARCHAR(128),
    ipa_issue_date          DATE,
    ipa_expiry_date         DATE,
    wp_number               VARCHAR(128),
    wp_issue_date           DATE,
    wp_expiry_date          DATE,
    fin_number              VARCHAR(64),
    card_collected          BOOLEAN NOT NULL DEFAULT FALSE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ppe_issuance (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    item_code               VARCHAR(64) NOT NULL,
    item_name               VARCHAR(128) NOT NULL,
    quantity                INT NOT NULL DEFAULT 1,
    issued_at               TIMESTAMPTZ,
    issued_by_user_id       UUID REFERENCES app_users (id),
    employee_confirmed      BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at            TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ppe_issuance_employee
    ON ppe_issuance (employee_id);

CREATE TABLE IF NOT EXISTS employee_acknowledgements (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    ack_type                VARCHAR(64) NOT NULL,
    acknowledged            BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at         TIMESTAMPTZ,
    ip_address              VARCHAR(64),
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_ack UNIQUE (onboarding_id, ack_type)
);

CREATE TABLE IF NOT EXISTS onboarding_audit_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID REFERENCES employees (id) ON DELETE SET NULL,
    onboarding_id           UUID REFERENCES candidate_onboarding (id) ON DELETE SET NULL,
    actor_user_id           UUID REFERENCES app_users (id),
    action                  VARCHAR(128) NOT NULL,
    from_status             VARCHAR(64),
    to_status               VARCHAR(64),
    details                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_audit_employee
    ON onboarding_audit_logs (employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_audit_created
    ON onboarding_audit_logs (created_at DESC);
