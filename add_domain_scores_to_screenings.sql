-- Add domain score columns to screenings table
-- These store AI-computed Denver II domain scores
-- Run this in Supabase SQL Editor

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

-- Add helpful comments
COMMENT ON COLUMN screenings.social_score_ai IS 'AI-computed score (0-100) for Personal-Social domain from Denver II questionnaire';
COMMENT ON COLUMN screenings.fine_motor_score_ai IS 'AI-computed score (0-100) for Fine Motor domain from Denver II questionnaire';
COMMENT ON COLUMN screenings.language_score_ai IS 'AI-computed score (0-100) for Language domain from Denver II questionnaire';
COMMENT ON COLUMN screenings.gross_motor_score_ai IS 'AI-computed score (0-100) for Gross Motor domain from Denver II questionnaire';

