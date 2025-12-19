-- Add screening_id column to payment_intents table
-- This creates a proper foreign key relationship between payments and screenings
-- Run this in Supabase SQL Editor

-- Add the screening_id column
ALTER TABLE payment_intents
ADD COLUMN IF NOT EXISTS screening_id UUID REFERENCES screenings(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_payment_intents_screening_id ON payment_intents(screening_id);

-- Migrate existing data from memo text
-- Extract screening_id from memo text format: "Screening: {UUID}"
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

-- Add comment for documentation
COMMENT ON COLUMN payment_intents.screening_id IS 'References screenings.id - links payment intent to a specific screening review';

