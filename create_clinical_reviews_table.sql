-- Create clinical_reviews table for professional clinical reviews
-- This table separates AI predictions from doctor diagnoses
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS clinical_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  pediatrician_id UUID, -- References profiles(id) - clinic user who performed the review
  
  -- Doctor's assessment per domain (0-100 scores)
  social_score_clinical INT CHECK (social_score_clinical IS NULL OR (social_score_clinical >= 0 AND social_score_clinical <= 100)),
  fine_motor_clinical INT CHECK (fine_motor_clinical IS NULL OR (fine_motor_clinical >= 0 AND fine_motor_clinical <= 100)),
  language_clinical INT CHECK (language_clinical IS NULL OR (language_clinical >= 0 AND language_clinical <= 100)),
  gross_motor_clinical INT CHECK (gross_motor_clinical IS NULL OR (gross_motor_clinical >= 0 AND gross_motor_clinical <= 100)),
  
  -- Final Verdict
  final_diagnosis TEXT, -- e.g., "Normal", "Global Developmental Delay", "Language Delay"
  recommendations TEXT, -- Markdown content for the parent
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
-- This assumes screenings are accessible via clinic_id in payment_intents
CREATE POLICY "Clinics can view clinical reviews"
ON clinical_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM screenings s
    INNER JOIN payment_intents pi ON pi.screening_id = s.id
    WHERE s.id = clinical_reviews.screening_id
    -- Add clinic_id check if needed: AND pi.clinic_id = current_clinic_id()
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

-- Add helpful comments
COMMENT ON TABLE clinical_reviews IS 'Stores professional clinical reviews by pediatricians, separating AI predictions from doctor diagnoses';
COMMENT ON COLUMN clinical_reviews.screening_id IS 'References screenings.id - the screening being reviewed';
COMMENT ON COLUMN clinical_reviews.pediatrician_id IS 'References profiles.id - the clinic user who performed the review';
COMMENT ON COLUMN clinical_reviews.social_score_clinical IS 'Clinical assessment score (0-100) for Personal-Social domain';
COMMENT ON COLUMN clinical_reviews.fine_motor_clinical IS 'Clinical assessment score (0-100) for Fine Motor domain';
COMMENT ON COLUMN clinical_reviews.language_clinical IS 'Clinical assessment score (0-100) for Language domain';
COMMENT ON COLUMN clinical_reviews.gross_motor_clinical IS 'Clinical assessment score (0-100) for Gross Motor domain';
COMMENT ON COLUMN clinical_reviews.final_diagnosis IS 'Final clinical diagnosis (e.g., "Normal", "Global Developmental Delay", "Language Delay")';
COMMENT ON COLUMN clinical_reviews.recommendations IS 'Markdown content with recommendations for the parent';
COMMENT ON COLUMN clinical_reviews.is_published IS 'Whether the review has been published/generated as a report for the parent';

