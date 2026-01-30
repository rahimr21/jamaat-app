-- Helper function to extract lat/lng from geography point
CREATE OR REPLACE FUNCTION get_point_coords(point_geog geography)
RETURNS TABLE (lat double precision, lng double precision)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ST_Y(point_geog::geometry) as lat,
    ST_X(point_geog::geometry) as lng;
$$;

GRANT EXECUTE ON FUNCTION get_point_coords TO service_role;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function to call notify-new-prayer edge function
CREATE OR REPLACE FUNCTION trigger_notify_new_prayer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := current_setting('app.settings.supabase_url', TRUE);
  service_role_key TEXT := current_setting('app.settings.service_role_key', TRUE);
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'prayer_sessions',
    'record', to_jsonb(NEW),
    'schema', 'public'
  );

  -- Call edge function asynchronously
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-new-prayer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if notification fails
  RAISE WARNING 'notify-new-prayer failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger function to call notify-prayer-joined edge function
CREATE OR REPLACE FUNCTION trigger_notify_prayer_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := current_setting('app.settings.supabase_url', TRUE);
  service_role_key TEXT := current_setting('app.settings.service_role_key', TRUE);
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'session_attendees',
    'record', to_jsonb(NEW),
    'schema', 'public'
  );

  -- Call edge function asynchronously
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-prayer-joined',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the insert if notification fails
  RAISE WARNING 'notify-prayer-joined failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_new_prayer_session
  AFTER INSERT ON prayer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_new_prayer();

CREATE TRIGGER on_prayer_attendee_joined
  AFTER INSERT ON session_attendees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_prayer_joined();
