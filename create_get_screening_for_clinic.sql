-- Create RPC function to get a single screening record for clinic view
-- This function bypasses RLS using SECURITY DEFINER to allow clinic access
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_screening_for_clinic(target_screening_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'child_name', s.child_name,
    'child_age_months', s.child_age_months,
    'ai_risk_score', s.ai_risk_score,
    'ai_summary', s.ai_summary,
    'answers', s.answers,
    'created_at', s.created_at
  )
  INTO result
  FROM screenings s
  WHERE s.id = target_screening_id;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
-- Note: Since this is SECURITY DEFINER, it will run with the function creator's privileges
GRANT EXECUTE ON FUNCTION get_screening_for_clinic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_screening_for_clinic(UUID) TO anon;
