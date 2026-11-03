-- Invitation link token (email) separate from short-lived OTP (2 minutes)

ALTER TABLE employee_invitations
    ADD COLUMN IF NOT EXISTS invitation_token_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS otp_last_sent_at TIMESTAMPTZ;

ALTER TABLE employee_invitations
    ALTER COLUMN otp_hash DROP NOT NULL;

-- Backfill invitation expiry from existing expires_at where missing
UPDATE employee_invitations
SET invitation_expires_at = COALESCE(invitation_expires_at, expires_at)
WHERE invitation_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_employee_status
    ON employee_invitations (employee_id, status);
