-- Eyota Workright HR — initial schema (PostgreSQL)

CREATE TYPE app_user_role AS ENUM ('ADMIN', 'HR', 'EMPLOYEE');
CREATE TYPE gps_policy AS ENUM ('MANDATORY', 'OPTIONAL', 'DISABLED');
CREATE TYPE employment_type AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');
CREATE TYPE employment_status AS ENUM ('ACTIVE', 'PROBATION', 'NOTICE', 'TERMINATED', 'RESIGNED');
CREATE TYPE work_location_mode AS ENUM ('OFFICE', 'HYBRID', 'REMOTE', 'SITE');
CREATE TYPE attendance_session_status AS ENUM ('OPEN', 'CLOSED', 'REJECTED_ATTEMPT');
CREATE TYPE geofence_result AS ENUM ('INSIDE', 'OUTSIDE', 'SKIPPED', 'UNKNOWN');
CREATE TYPE attendance_work_mode AS ENUM ('OFFICE', 'SITE', 'WFH');
CREATE TYPE leave_request_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE claim_request_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');
CREATE TYPE payroll_run_status AS ENUM ('DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE manpower_request_status AS ENUM ('OPEN', 'FILLED', 'CANCELLED');
CREATE TYPE compliance_item_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
CREATE TYPE document_category AS ENUM ('IDENTITY', 'CONTRACT', 'PAYSLIP', 'CERTIFICATE', 'OTHER');

-- Master data (referenced by employees)
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(32) NOT NULL UNIQUE,
    name            VARCHAR(128) NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE designations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(32) NOT NULL UNIQUE,
    title           VARCHAR(128) NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workplaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(32) NOT NULL UNIQUE,
    name            VARCHAR(128) NOT NULL,
    address         TEXT,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    radius_metres   INTEGER NOT NULL DEFAULT 150,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    gps_policy      gps_policy NOT NULL DEFAULT 'MANDATORY',
    wfh_allowed     BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from  DATE,
    effective_to    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workplaces_active ON workplaces (active);

CREATE TABLE employees (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code           VARCHAR(32) NOT NULL UNIQUE,
    full_name               VARCHAR(256) NOT NULL,
    nric_fin_encrypted      VARCHAR(512),
    department              VARCHAR(128),
    designation             VARCHAR(128),
    employment_type         employment_type NOT NULL DEFAULT 'FULL_TIME',
    employment_status       employment_status NOT NULL DEFAULT 'ACTIVE',
    work_location_mode      work_location_mode NOT NULL DEFAULT 'OFFICE',
    workplace_id            UUID REFERENCES workplaces (id),
    manager_employee_id     UUID REFERENCES employees (id),
    date_of_joining         DATE,
    probation_end           DATE,
    notice_end              DATE,
    mobile                  VARCHAR(32),
    personal_email          VARCHAR(256),
    bank_name               VARCHAR(128),
    bank_account_masked     VARCHAR(64),
    active                  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_workplace ON employees (workplace_id);
CREATE INDEX idx_employees_manager ON employees (manager_employee_id);
CREATE INDEX idx_employees_active ON employees (active);

CREATE TABLE app_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(256) NOT NULL UNIQUE,
    password_hash   VARCHAR(256) NOT NULL,
    role            app_user_role NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    employee_id     UUID REFERENCES employees (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_users_employee ON app_users (employee_id);
CREATE INDEX idx_app_users_role ON app_users (role);

CREATE TABLE attendance_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id),
    workplace_id            UUID REFERENCES workplaces (id),
    attendance_date         DATE NOT NULL,
    clock_in_at             TIMESTAMPTZ,
    clock_out_at            TIMESTAMPTZ,
    clock_in_lat            DOUBLE PRECISION,
    clock_in_lng            DOUBLE PRECISION,
    clock_in_accuracy       DOUBLE PRECISION,
    clock_out_lat           DOUBLE PRECISION,
    clock_out_lng           DOUBLE PRECISION,
    clock_out_accuracy      DOUBLE PRECISION,
    geofence_result         geofence_result,
    distance_metres         DOUBLE PRECISION,
    status                  attendance_session_status NOT NULL DEFAULT 'OPEN',
    late_minutes            INTEGER DEFAULT 0,
    work_mode               attendance_work_mode,
    client_captured_in_at   TIMESTAMPTZ,
    client_captured_out_at  TIMESTAMPTZ,
    correction_reason       TEXT,
    corrected_by            UUID REFERENCES app_users (id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX idx_attendance_employee_date ON attendance_sessions (employee_id, attendance_date DESC);
CREATE INDEX idx_attendance_workplace ON attendance_sessions (workplace_id);
CREATE INDEX idx_attendance_status ON attendance_sessions (status);

CREATE TABLE attendance_reject_audit (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees (id),
    attempted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    accuracy        DOUBLE PRECISION,
    reason_code     VARCHAR(64) NOT NULL,
    message         TEXT,
    workplace_id    UUID REFERENCES workplaces (id)
);

CREATE INDEX idx_attendance_reject_employee ON attendance_reject_audit (employee_id, attempted_at DESC);

CREATE TABLE audit_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   UUID REFERENCES app_users (id),
    action          VARCHAR(64) NOT NULL,
    entity_type     VARCHAR(64) NOT NULL,
    entity_id       UUID,
    detail          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_events_created ON audit_events (created_at DESC);
CREATE INDEX idx_audit_events_entity ON audit_events (entity_type, entity_id);

CREATE TABLE leave_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(32) NOT NULL UNIQUE,
    name            VARCHAR(128) NOT NULL,
    paid            BOOLEAN NOT NULL DEFAULT TRUE,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leave_balances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees (id),
    leave_type_id   UUID NOT NULL REFERENCES leave_types (id),
    year            INTEGER NOT NULL,
    entitled_days   NUMERIC(6, 2) NOT NULL DEFAULT 0,
    used_days       NUMERIC(6, 2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_leave_balance UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE leave_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees (id),
    leave_type_id   UUID NOT NULL REFERENCES leave_types (id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    days            NUMERIC(6, 2) NOT NULL,
    reason          TEXT,
    status          leave_request_status NOT NULL DEFAULT 'DRAFT',
    submitted_at    TIMESTAMPTZ,
    decided_at      TIMESTAMPTZ,
    decided_by      UUID REFERENCES app_users (id),
    decision_note   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_employee ON leave_requests (employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests (status);

CREATE TABLE claim_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID NOT NULL REFERENCES employees (id),
    claim_date      DATE NOT NULL,
    category        VARCHAR(64) NOT NULL,
    amount          NUMERIC(12, 2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'SGD',
    description     TEXT,
    status          claim_request_status NOT NULL DEFAULT 'DRAFT',
    submitted_at    TIMESTAMPTZ,
    decided_at      TIMESTAMPTZ,
    decided_by      UUID REFERENCES app_users (id),
    decision_note   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claim_requests_employee ON claim_requests (employee_id);
CREATE INDEX idx_claim_requests_status ON claim_requests (status);

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(32) NOT NULL UNIQUE,
    name            VARCHAR(256) NOT NULL,
    client_name     VARCHAR(256),
    start_date      DATE,
    end_date        DATE,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE manpower_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects (id),
    role_title      VARCHAR(128) NOT NULL,
    headcount       INTEGER NOT NULL DEFAULT 1,
    status          manpower_request_status NOT NULL DEFAULT 'OPEN',
    requested_by    UUID REFERENCES app_users (id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects (id),
    employee_id     UUID NOT NULL REFERENCES employees (id),
    allocation_pct  NUMERIC(5, 2) NOT NULL DEFAULT 100,
    start_date      DATE NOT NULL,
    end_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_allocation UNIQUE (project_id, employee_id, start_date)
);

CREATE TABLE compliance_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID REFERENCES employees (id),
    code            VARCHAR(64) NOT NULL,
    title           VARCHAR(256) NOT NULL,
    due_date        DATE,
    status          compliance_item_status NOT NULL DEFAULT 'PENDING',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_employee ON compliance_items (employee_id);

CREATE TABLE payroll_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(32) NOT NULL UNIQUE,
    year            INTEGER NOT NULL,
    month           INTEGER NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    closed          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payroll_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_period_id UUID NOT NULL REFERENCES payroll_periods (id),
    run_number      INTEGER NOT NULL DEFAULT 1,
    status          payroll_run_status NOT NULL DEFAULT 'DRAFT',
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payslips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id  UUID NOT NULL REFERENCES payroll_runs (id),
    employee_id     UUID NOT NULL REFERENCES employees (id),
    gross_amount    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'SGD',
    published       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payslip_run_employee UNIQUE (payroll_run_id, employee_id)
);

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID REFERENCES employees (id),
    category        document_category NOT NULL DEFAULT 'OTHER',
    file_name       VARCHAR(512) NOT NULL,
    content_type    VARCHAR(128),
    storage_key     VARCHAR(512) NOT NULL,
    size_bytes      BIGINT,
    uploaded_by     UUID REFERENCES app_users (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_employee ON documents (employee_id);
