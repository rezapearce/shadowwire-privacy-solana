-- KiddyGuard Phase 2: Consolidated Database Migration
-- This script consolidates all Phase 2 schema changes
-- Run this in Supabase SQL Editor

-- ============================================================================
-- 1. Create Clinical Reviews Table
-- Separates medical verdicts from raw screening data for auditability
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  pediatrician_id UUID, -- References profiles(id) - optional for now
  
  -- Clinical Domain Scores (to compare against AI)
  social_score_clinical INT CHECK (social_score_clinical IS NULL OR (social_score_clinical >= 0 AND social_score_clinical <= 100)),
  fine_motor_clinical INT CHECK (fine_motor_clinical IS NULL OR (fine_motor_clinical >= 0 AND fine_motor_clinical <= 100)),
  language_clinical INT CHECK (language_clinical IS NULL OR (language_clinical >= 0 AND language_clinical <= 100)),
  gross_motor_clinical INT CHECK (gross_motor_clinical IS NULL OR (gross_motor_clinical >= 0 AND gross_motor_clinical <= 100)),
  
  -- Medical Verdict
  final_diagnosis TEXT,
  recommendations TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinical_reviews_screening_id ON clinical_reviews(screening_id);
CREATE INDEX IF NOT EXISTS idx_clinical_reviews_pediatrician_id ON clinical_reviews(pediatrician_id);
CREATE INDEX IF NOT EXISTS idx_clinical_reviews_is_published ON clinical_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_clinical_reviews_created_at ON clinical_reviews(created_at DESC);

-- Enable Row Level Security
ALTER TABLE clinical_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clinics can view reviews for screenings they have access to
CREATE POLICY "Clinics can view clinical reviews"
ON clinical_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM screenings s
    INNER JOIN payment_intents pi ON pi.screening_id = s.id
    WHERE s.id = clinical_reviews.screening_id
    AND pi.status = 'SETTLED'
  )
);

-- RLS Policy: Clinics can insert reviews for screenings they have access to
CREATE POLICY "Clinics can insert clinical reviews"
ON clinical_reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM screenings s
    INNER JOIN payment_intents pi ON pi.screening_id = s.id
    WHERE s.id = clinical_reviews.screening_id
    AND pi.status = 'SETTLED'
  )
);

-- RLS Policy: Clinics can update their own reviews
CREATE POLICY "Clinics can update clinical reviews"
ON clinical_reviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM screenings s
    INNER JOIN payment_intents pi ON pi.screening_id = s.id
    WHERE s.id = clinical_reviews.screening_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM screenings s
    INNER JOIN payment_intents pi ON pi.screening_id = s.id
    WHERE s.id = clinical_reviews.screening_id
  )
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clinical_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_clinical_reviews_updated_at ON clinical_reviews;
CREATE TRIGGER update_clinical_reviews_updated_at
  BEFORE UPDATE ON clinical_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_clinical_reviews_updated_at();

-- ============================================================================
-- 2. Enhance Payment Intents for Cryptographic Trust
-- Adds foreign key to screenings and a hash column for Zcash verification
-- ============================================================================

ALTER TABLE payment_intents 
ADD COLUMN IF NOT EXISTS screening_id UUID REFERENCES screenings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS clinical_review_hash TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_screening_id ON payment_intents(screening_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_clinical_review_hash ON payment_intents(clinical_review_hash);

-- Migrate existing data from memo text
UPDATE payment_intents
SET screening_id = (
  SELECT id::text::uuid
  FROM screenings
  WHERE id::text = TRIM(SPLIT_PART(memo, 'Screening: ', 2))
  LIMIT 1
)
WHERE screening_id IS NULL
  AND memo LIKE 'Screening: %'
  AND EXISTS (
    SELECT 1 FROM screenings
    WHERE id::text = TRIM(SPLIT_PART(memo, 'Screening: ', 2))
  );

-- ============================================================================
-- 3. Enhance Screenings for Dashboard Performance
-- Stores computed AI scores for rapid filtering in the clinic queue
-- ============================================================================

ALTER TABLE screenings
ADD COLUMN IF NOT EXISTS social_score_ai INT CHECK (social_score_ai IS NULL OR (social_score_ai >= 0 AND social_score_ai <= 100)),
ADD COLUMN IF NOT EXISTS fine_motor_score_ai INT CHECK (fine_motor_score_ai IS NULL OR (fine_motor_score_ai >= 0 AND fine_motor_score_ai <= 100)),
ADD COLUMN IF NOT EXISTS language_score_ai INT CHECK (language_score_ai IS NULL OR (language_score_ai >= 0 AND language_score_ai <= 100)),
ADD COLUMN IF NOT EXISTS gross_motor_score_ai INT CHECK (gross_motor_score_ai IS NULL OR (gross_motor_score_ai >= 0 AND gross_motor_score_ai <= 100));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_screenings_social_score_ai ON screenings(social_score_ai);
CREATE INDEX IF NOT EXISTS idx_screenings_fine_motor_score_ai ON screenings(fine_motor_score_ai);
CREATE INDEX IF NOT EXISTS idx_screenings_language_score_ai ON screenings(language_score_ai);
CREATE INDEX IF NOT EXISTS idx_screenings_gross_motor_score_ai ON screenings(gross_motor_score_ai);
CREATE INDEX IF NOT EXISTS idx_screenings_status_payment ON screenings(status) WHERE status = 'PENDING_REVIEW';

-- ============================================================================
-- 4. Enable Supabase Realtime for Parent Dashboard Updates
-- ============================================================================

-- Enable Realtime for screenings table
ALTER PUBLICATION supabase_realtime ADD TABLE screenings;

-- Enable Realtime for clinical_reviews table
ALTER PUBLICATION supabase_realtime ADD TABLE clinical_reviews;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE clinical_reviews IS 'Stores professional clinical reviews by pediatricians, separating AI predictions from doctor diagnoses';
COMMENT ON COLUMN clinical_reviews.screening_id IS 'References screenings.id - the screening being reviewed';
COMMENT ON COLUMN clinical_reviews.pediatrician_id IS 'References profiles.id - the clinic user who performed the review';
COMMENT ON COLUMN payment_intents.screening_id IS 'References screenings.id - links payment intent to a specific screening review';
COMMENT ON COLUMN payment_intents.clinical_review_hash IS 'SHA-256 hash of clinical review data - cryptographically links payment to medical result without exposing payer identity';
COMMENT ON COLUMN screenings.social_score_ai IS 'AI-computed score (0-100) for Personal-Social domain from Denver II questionnaire';
COMMENT ON COLUMN screenings.fine_motor_score_ai IS 'AI-computed score (0-100) for Fine Motor domain from Denver II questionnaire';
COMMENT ON COLUMN screenings.language_score_ai IS 'AI-computed score (0-100) for Language domain from Denver II questionnaire';
COMMENT ON COLUMN screenings.gross_motor_score_ai IS 'AI-computed score (0-100) for Gross Motor domain from Denver II questionnaire';

