-- PPE receipt photo: employee must upload a photo to complete PPE confirmation;
-- HR then verifies the photo (SG_PPE_PHOTO_VERIFIED).
DO $$ BEGIN
    ALTER TYPE onboarding_doc_type ADD VALUE 'PPE_RECEIPT_PHOTO';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE candidate_onboarding
    ADD COLUMN IF NOT EXISTS ppe_photo_document_id UUID,
    ADD COLUMN IF NOT EXISTS ppe_hr_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ppe_hr_verified_by_user_id UUID;
