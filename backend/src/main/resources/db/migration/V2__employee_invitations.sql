-- Employee self-service activation invitations (OTP + set password)

CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACTIVATED', 'EXPIRED', 'REVOKED');

CREATE TABLE employee_invitations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees (id),
    user_id             UUID NOT NULL REFERENCES app_users (id),
    email               VARCHAR(256) NOT NULL,
    otp_hash            VARCHAR(256) NOT NULL,
    status              invitation_status NOT NULL DEFAULT 'PENDING',
    expires_at          TIMESTAMPTZ NOT NULL,
    attempt_count       INTEGER NOT NULL DEFAULT 0,
    max_attempts        INTEGER NOT NULL DEFAULT 5,
    activated_at        TIMESTAMPTZ,
    last_sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id  UUID REFERENCES app_users (id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employee_invitations_email ON employee_invitations (LOWER(email));
CREATE INDEX idx_employee_invitations_employee ON employee_invitations (employee_id);
CREATE INDEX idx_employee_invitations_status ON employee_invitations (status);
