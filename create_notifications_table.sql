-- Create notifications table for in-app notification system
-- Run this in Supabase SQL Editor
-- 
-- Purpose: When a doctor finalizes a review, parents receive notifications.
-- Privacy: Only the targeted family can read their notifications.

-- Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  screening_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_user_id
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

ALTER TABLE notifications
  ADD CONSTRAINT fk_notifications_screening_id
  FOREIGN KEY (screening_id)
  REFERENCES screenings(id)
  ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_screening_id ON notifications(screening_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

-- RLS Policy: Users can SELECT their own notifications
-- Only allows users to see notifications where user_id matches their auth.uid()
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (user_id = auth.uid());

-- Note: INSERT policy is not needed for service role
-- Service role key bypasses RLS by default in Supabase
-- Clinics will use service role key to insert notifications when reviews are finalized

-- Add helpful comments
COMMENT ON TABLE notifications IS 'Stores in-app notifications for users. Triggered when doctors finalize reviews.';
COMMENT ON COLUMN notifications.user_id IS 'References profiles.id - the user who should receive this notification';
COMMENT ON COLUMN notifications.screening_id IS 'References screenings.id - optional link to the screening that triggered this notification';
COMMENT ON COLUMN notifications.title IS 'Notification title, e.g., "Results Ready"';
COMMENT ON COLUMN notifications.message IS 'Notification message, e.g., "Dr. Smith has completed the review for Alex."';
COMMENT ON COLUMN notifications.is_read IS 'Whether the user has read this notification (default: false)';
COMMENT ON COLUMN notifications.created_at IS 'Timestamp when the notification was created';

