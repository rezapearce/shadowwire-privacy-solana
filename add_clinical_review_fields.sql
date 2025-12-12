-- Add clinical review columns to screenings table
-- Run this in Supabase SQL Editor

ALTER TABLE screenings
ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
ADD COLUMN IF NOT EXISTS clinical_risk_level TEXT CHECK (clinical_risk_level IS NULL OR clinical_risk_level IN ('LOW', 'MODERATE', 'HIGH')),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

-- Add helpful comments
COMMENT ON COLUMN screenings.clinical_notes IS 'Pediatrician''s detailed clinical observations and notes';
COMMENT ON COLUMN screenings.clinical_risk_level IS 'Final clinical risk assessment: LOW, MODERATE, or HIGH';
COMMENT ON COLUMN screenings.reviewed_at IS 'Timestamp when clinical review was completed';
COMMENT ON COLUMN screenings.reviewed_by IS 'Clinic ID or Doctor Name for audit trail';
