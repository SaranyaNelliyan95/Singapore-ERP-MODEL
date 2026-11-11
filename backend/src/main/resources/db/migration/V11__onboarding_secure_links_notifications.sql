-- Secure confirmation links + notification outbox (SG-flow v2 additive)

CREATE TABLE IF NOT EXISTS onboarding_secure_links (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    action_type             VARCHAR(32) NOT NULL,
    token_hash              VARCHAR(128) NOT NULL UNIQUE,
    expires_at              TIMESTAMPTZ NOT NULL,
    used_at                 TIMESTAMPTZ,
    revoked_at              TIMESTAMPTZ,
    failed_attempts         INT NOT NULL DEFAULT 0,
    locked_at               TIMESTAMPTZ,
    created_by_user_id      UUID REFERENCES app_users (id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_onboarding_secure_link_active UNIQUE (onboarding_id, action_type, token_hash)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_secure_links_employee
    ON onboarding_secure_links (employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_secure_links_action
    ON onboarding_secure_links (onboarding_id, action_type);

CREATE TABLE IF NOT EXISTS onboarding_notification_outbox (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID REFERENCES employees (id) ON DELETE SET NULL,
    onboarding_id           UUID REFERENCES candidate_onboarding (id) ON DELETE SET NULL,
    channel                 VARCHAR(16) NOT NULL,
    template_code           VARCHAR(64),
    destination_masked      VARCHAR(256),
    subject                 VARCHAR(512),
    body_preview            TEXT,
    status                  VARCHAR(32) NOT NULL DEFAULT 'MOCK_LOGGED',
    provider_message_id     VARCHAR(128),
    error_message           TEXT,
    meta_json               TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_outbox_created
    ON onboarding_notification_outbox (created_at DESC);

CREATE TABLE IF NOT EXISTS onboarding_link_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id                 UUID REFERENCES onboarding_secure_links (id) ON DELETE SET NULL,
    employee_id             UUID REFERENCES employees (id) ON DELETE SET NULL,
    event_type              VARCHAR(32) NOT NULL,
    channel                 VARCHAR(16),
    ip_address              VARCHAR(64),
    user_agent              VARCHAR(512),
    details                 TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE candidate_onboarding
    ADD COLUMN IF NOT EXISTS whatsapp_consent BOOLEAN,
    ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS induction_trainer_name VARCHAR(128),
    ADD COLUMN IF NOT EXISTS induction_date DATE,
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS onboarded_by_user_id UUID REFERENCES app_users (id);

CREATE TABLE IF NOT EXISTS onboarding_ppe_photos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id             UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    onboarding_id           UUID NOT NULL REFERENCES candidate_onboarding (id) ON DELETE CASCADE,
    storage_path            VARCHAR(1024) NOT NULL,
    content_type            VARCHAR(128),
    size_bytes              BIGINT,
    sha256                  VARCHAR(64),
    review_status           VARCHAR(32) NOT NULL DEFAULT 'PENDING_HR_VERIFICATION',
    review_reason           TEXT,
    attempt_no              INT NOT NULL DEFAULT 1,
    uploaded_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at             TIMESTAMPTZ,
    verified_by_user_id     UUID REFERENCES app_users (id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
