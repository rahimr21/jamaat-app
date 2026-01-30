-- Migration: Cancel session and prayer space approval notifications
-- This adds triggers to notify users when a session is cancelled
-- or when their prayer space submission is approved

-- ============================================
-- 1. TRIGGER FOR SESSION CANCELLATION
-- ============================================

-- Trigger function to call notify-session-cancelled edge function
CREATE OR REPLACE FUNCTION trigger_notify_session_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := current_setting('app.settings.supabase_url', TRUE);
  service_role_key TEXT := current_setting('app.settings.service_role_key', TRUE);
  payload JSONB;
BEGIN
  -- Only trigger when is_cancelled changes from false to true
  IF OLD.is_cancelled = false AND NEW.is_cancelled = true THEN
    payload := jsonb_build_object(
      'type', 'CANCEL',
      'table', 'prayer_sessions',
      'record', to_jsonb(NEW),
      'schema', 'public'
    );

    -- Call edge function asynchronously
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-session-cancelled',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the update if notification fails
  RAISE WARNING 'notify-session-cancelled failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger for session cancellation
DROP TRIGGER IF EXISTS on_session_cancelled ON prayer_sessions;
CREATE TRIGGER on_session_cancelled
  AFTER UPDATE ON prayer_sessions
  FOR EACH ROW
  WHEN (OLD.is_cancelled = false AND NEW.is_cancelled = true)
  EXECUTE FUNCTION trigger_notify_session_cancelled();

-- ============================================
-- 2. TRIGGER FOR PRAYER SPACE APPROVAL
-- ============================================

-- Trigger function to call notify-space-approved edge function
CREATE OR REPLACE FUNCTION trigger_notify_space_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := current_setting('app.settings.supabase_url', TRUE);
  service_role_key TEXT := current_setting('app.settings.service_role_key', TRUE);
  payload JSONB;
BEGIN
  -- Only trigger when verification_status changes to 'approved'
  IF (OLD.verification_status IS DISTINCT FROM 'approved') AND NEW.verification_status = 'approved' THEN
    payload := jsonb_build_object(
      'type', 'APPROVED',
      'table', 'prayer_spaces',
      'record', to_jsonb(NEW),
      'schema', 'public'
    );

    -- Call edge function asynchronously
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/notify-space-approved',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the update if notification fails
  RAISE WARNING 'notify-space-approved failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger for prayer space approval
DROP TRIGGER IF EXISTS on_space_approved ON prayer_spaces;
CREATE TRIGGER on_space_approved
  AFTER UPDATE ON prayer_spaces
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM 'approved' AND NEW.verification_status = 'approved')
  EXECUTE FUNCTION trigger_notify_space_approved();

-- ============================================
-- 3. UPDATE RLS POLICY FOR CANCEL
-- ============================================

-- Ensure creators can update is_cancelled on their own sessions
-- This should already be covered by the existing update policy,
-- but let's make it explicit
DROP POLICY IF EXISTS "Users can cancel own sessions" ON prayer_sessions;
CREATE POLICY "Users can cancel own sessions"
  ON prayer_sessions FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
