-- Company-wide attendance GPS policy (admin toggle). Single-row table.
CREATE TABLE IF NOT EXISTS attendance_gps_policy (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gps_mandatory   BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by      UUID
);

INSERT INTO attendance_gps_policy (id, gps_mandatory)
SELECT gen_random_uuid(), TRUE
WHERE NOT EXISTS (SELECT 1 FROM attendance_gps_policy);
