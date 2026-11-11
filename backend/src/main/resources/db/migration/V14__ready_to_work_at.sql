-- Timestamp when candidate first reached Ready to Work (keep visible in HR list for 7 days)
ALTER TABLE candidate_onboarding
    ADD COLUMN IF NOT EXISTS ready_to_work_at TIMESTAMPTZ;

-- Best-effort backfill for already-completed rows (use updated_at)
UPDATE candidate_onboarding
SET ready_to_work_at = COALESCE(ready_to_work_at, updated_at)
WHERE pipeline_status = 'READY_TO_WORK'
  AND ready_to_work_at IS NULL;
