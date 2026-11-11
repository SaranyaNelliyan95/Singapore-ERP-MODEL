-- Construction safety must stay PENDING until HR marks Completed on the programmes form.
-- Previous default NOT_APPLICABLE was treated as "done" by programmeDone(), so the
-- pipeline showed Completed as soon as ensureSgTasks ran (e.g. after OTP / detail load).
ALTER TABLE candidate_onboarding
    ALTER COLUMN construction_safety_status SET DEFAULT 'PENDING'::programme_outcome;

UPDATE candidate_onboarding
SET construction_safety_status = 'PENDING'::programme_outcome
WHERE construction_safety_status = 'NOT_APPLICABLE'::programme_outcome;

UPDATE onboarding_tasks t
SET status = 'PENDING'::onboarding_task_status,
    completed_at = NULL,
    completed_by_user_id = NULL
FROM candidate_onboarding co
WHERE t.onboarding_id = co.id
  AND t.task_code = 'SG_CONSTRUCTION_SAFETY'
  AND t.status = 'COMPLETED'::onboarding_task_status
  AND co.construction_safety_status = 'PENDING'::programme_outcome;
