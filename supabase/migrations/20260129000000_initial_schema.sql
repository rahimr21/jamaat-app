-- Jamaat Initial Database Schema
-- Run this migration in Supabase Dashboard SQL Editor or via supabase db push
-- Ensure PostGIS extension is enabled before running

-- ============================================
-- 1. EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 2. TABLES
-- ============================================

-- Universities table
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location GEOGRAPHY(POINT, 4326),
  email_domain TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'United States',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_email_domain CHECK (
    email_domain IS NULL OR email_domain ~ '^@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
  )
);

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  display_name TEXT NOT NULL,
  is_student BOOLEAN DEFAULT false,
  university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
  expo_push_token TEXT,
  notification_preferences JSONB DEFAULT '{
    "new_prayers": true,
    "prayer_joined": true,
    "daily_reminders": false
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_display_name CHECK (char_length(display_name) BETWEEN 2 AND 50)
);

-- Prayer spaces table
CREATE TABLE public.prayer_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  space_type TEXT NOT NULL CHECK (space_type IN ('campus', 'masjid', 'community_center', 'custom')),
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_name CHECK (char_length(name) BETWEEN 3 AND 100),
  CONSTRAINT university_required_for_campus CHECK (
    (space_type = 'campus' AND university_id IS NOT NULL) OR
    (space_type != 'campus')
  )
);

-- Prayer sessions table
CREATE TABLE public.prayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_space_id UUID REFERENCES prayer_spaces(id) ON DELETE CASCADE,
  custom_location GEOGRAPHY(POINT, 4326),
  custom_location_name TEXT,
  prayer_type TEXT NOT NULL CHECK (prayer_type IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah')),
  scheduled_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_location CHECK (
    (prayer_space_id IS NOT NULL AND custom_location IS NULL) OR
    (prayer_space_id IS NULL AND custom_location IS NOT NULL)
  ),
  CONSTRAINT future_scheduled_time CHECK (scheduled_time > created_at),
  CONSTRAINT valid_notes_length CHECK (char_length(notes) <= 500)
);

-- Session attendees table
CREATE TABLE public.session_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES prayer_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- ============================================
-- 3. INDEXES
-- ============================================

-- Universities indexes
CREATE INDEX idx_universities_name ON universities(name);
CREATE INDEX idx_universities_location ON universities USING GIST(location);
CREATE INDEX idx_universities_active ON universities(is_active) WHERE is_active = true;
CREATE INDEX idx_universities_name_trgm ON universities USING gin(name gin_trgm_ops);

-- Users indexes
CREATE INDEX idx_users_university ON users(university_id);
CREATE INDEX idx_users_expo_token ON users(expo_push_token) WHERE expo_push_token IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Prayer spaces indexes
CREATE INDEX idx_prayer_spaces_university ON prayer_spaces(university_id);
CREATE INDEX idx_prayer_spaces_location ON prayer_spaces USING GIST(location);
CREATE INDEX idx_prayer_spaces_verified ON prayer_spaces(is_verified, space_type);
CREATE INDEX idx_prayer_spaces_creator ON prayer_spaces(created_by);

-- Prayer sessions indexes
CREATE INDEX idx_prayer_sessions_space ON prayer_sessions(prayer_space_id);
CREATE INDEX idx_prayer_sessions_time ON prayer_sessions(scheduled_time) WHERE is_active = true;
CREATE INDEX idx_prayer_sessions_creator ON prayer_sessions(created_by);
CREATE INDEX idx_prayer_sessions_prayer_type ON prayer_sessions(prayer_type);
CREATE INDEX idx_prayer_sessions_location ON prayer_sessions USING GIST(custom_location);
CREATE INDEX idx_prayer_sessions_active ON prayer_sessions(is_active, scheduled_time) WHERE is_active = true;

-- Session attendees indexes
CREATE INDEX idx_session_attendees_session ON session_attendees(session_id);
CREATE INDEX idx_session_attendees_user ON session_attendees(user_id);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Get sessions within radius
CREATE OR REPLACE FUNCTION get_sessions_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 3218,
  from_time TIMESTAMPTZ DEFAULT NOW(),
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  session_id UUID,
  prayer_type TEXT,
  scheduled_time TIMESTAMPTZ,
  space_name TEXT,
  space_type TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  attendee_count BIGINT,
  notes TEXT,
  created_by_id UUID,
  created_by_name TEXT,
  is_cancelled BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.prayer_type,
    ps.scheduled_time,
    COALESCE(psp.name, ps.custom_location_name, 'Custom Location') as space_name,
    COALESCE(psp.space_type, 'custom') as space_type,
    ST_Y(COALESCE(psp.location, ps.custom_location)::geometry) as location_lat,
    ST_X(COALESCE(psp.location, ps.custom_location)::geometry) as location_lng,
    ST_Distance(
      COALESCE(psp.location, ps.custom_location),
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters,
    COUNT(DISTINCT sa.id) as attendee_count,
    ps.notes,
    ps.created_by,
    u.display_name as created_by_name,
    ps.is_cancelled
  FROM prayer_sessions ps
  LEFT JOIN prayer_spaces psp ON ps.prayer_space_id = psp.id
  LEFT JOIN session_attendees sa ON ps.id = sa.session_id
  LEFT JOIN users u ON ps.created_by = u.id
  WHERE ps.is_active = true
    AND ps.is_cancelled = false
    AND ps.scheduled_time >= from_time
    AND ST_DWithin(
      COALESCE(psp.location, ps.custom_location),
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  GROUP BY 
    ps.id, 
    ps.prayer_type,
    ps.scheduled_time,
    ps.custom_location_name,
    ps.notes,
    ps.created_by,
    ps.is_cancelled,
    ps.custom_location,
    psp.name, 
    psp.space_type, 
    psp.location, 
    u.display_name
  ORDER BY ps.scheduled_time ASC
  LIMIT limit_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sessions_within_radius TO authenticated;

-- Deactivate past sessions
CREATE OR REPLACE FUNCTION deactivate_past_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE prayer_sessions
  SET is_active = false
  WHERE scheduled_time < NOW() - INTERVAL '30 minutes'
    AND is_active = true;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$$;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION deactivate_past_sessions TO service_role;

-- Get user's sessions
CREATE OR REPLACE FUNCTION get_user_sessions(
  user_uuid UUID,
  include_past BOOLEAN DEFAULT false
)
RETURNS TABLE (
  session_id UUID,
  prayer_type TEXT,
  scheduled_time TIMESTAMPTZ,
  space_name TEXT,
  attendee_count BIGINT,
  is_creator BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.prayer_type,
    ps.scheduled_time,
    COALESCE(psp.name, ps.custom_location_name, 'Custom Location') as space_name,
    COUNT(DISTINCT sa.id) as attendee_count,
    (ps.created_by = user_uuid) as is_creator
  FROM prayer_sessions ps
  LEFT JOIN prayer_spaces psp ON ps.prayer_space_id = psp.id
  LEFT JOIN session_attendees sa ON ps.id = sa.session_id
  WHERE ps.is_active = true
    AND ps.is_cancelled = false
    AND (
      ps.created_by = user_uuid OR
      EXISTS (
        SELECT 1 FROM session_attendees
        WHERE session_id = ps.id AND user_id = user_uuid
      )
    )
    AND (include_past OR ps.scheduled_time >= NOW())
  GROUP BY ps.id, psp.name, ps.custom_location_name
  ORDER BY ps.scheduled_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_sessions TO authenticated;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_sessions_updated_at
  BEFORE UPDATE ON prayer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_spaces_updated_at
  BEFORE UPDATE ON prayer_spaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Rate limiting: max 10 sessions per day
CREATE OR REPLACE FUNCTION check_session_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO session_count
  FROM prayer_sessions
  WHERE created_by = NEW.created_by
    AND created_at >= NOW() - INTERVAL '24 hours';
  
  IF session_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 sessions per day'
      USING HINT = 'Wait 24 hours before creating more sessions';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_session_rate_limit
  BEFORE INSERT ON prayer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION check_session_creation_limit();

-- Auto-add creator as attendee
CREATE OR REPLACE FUNCTION add_creator_as_attendee()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO session_attendees (session_id, user_id)
  VALUES (NEW.id, NEW.created_by)
  ON CONFLICT (session_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_add_creator_attendee
  AFTER INSERT ON prayer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_attendee();

-- Prevent joining past sessions
CREATE OR REPLACE FUNCTION prevent_joining_past_sessions()
RETURNS TRIGGER AS $$
DECLARE
  session_time TIMESTAMPTZ;
BEGIN
  SELECT scheduled_time INTO session_time
  FROM prayer_sessions
  WHERE id = NEW.session_id;
  
  IF session_time < NOW() THEN
    RAISE EXCEPTION 'Cannot join a session that has already started'
      USING HINT = 'Find an upcoming prayer session instead';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_past_session_join
  BEFORE INSERT ON session_attendees
  FOR EACH ROW
  EXECUTE FUNCTION prevent_joining_past_sessions();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendees ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Universities policies
CREATE POLICY "Universities are publicly readable"
  ON universities FOR SELECT
  USING (is_active = true);

-- Prayer spaces policies
CREATE POLICY "Users can view verified or own spaces"
  ON prayer_spaces FOR SELECT
  USING (
    is_verified = true OR 
    created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create spaces"
  ON prayer_spaces FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    created_by = auth.uid()
  );

CREATE POLICY "Users can update own unverified spaces"
  ON prayer_spaces FOR UPDATE
  USING (
    created_by = auth.uid() AND 
    is_verified = false
  )
  WITH CHECK (
    created_by = auth.uid() AND 
    is_verified = false
  );

-- Prayer sessions policies
CREATE POLICY "Anyone can view active sessions"
  ON prayer_sessions FOR SELECT
  USING (
    is_active = true AND 
    is_cancelled = false
  );

CREATE POLICY "Authenticated users can create sessions"
  ON prayer_sessions FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    created_by = auth.uid()
  );

CREATE POLICY "Users can update own sessions"
  ON prayer_sessions FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON prayer_sessions FOR DELETE
  USING (created_by = auth.uid());

-- Session attendees policies
CREATE POLICY "Anyone can view attendees"
  ON session_attendees FOR SELECT
  USING (true);

CREATE POLICY "Users can join sessions"
  ON session_attendees FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    user_id = auth.uid()
  );

CREATE POLICY "Users can leave sessions"
  ON session_attendees FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 7. SEED DATA
-- ============================================

-- Insert sample universities
INSERT INTO universities (name, location, email_domain, city, state, country) VALUES
  ('Boston College', ST_SetSRID(ST_MakePoint(-71.1686, 42.3355), 4326)::geography, '@bc.edu', 'Chestnut Hill', 'MA', 'United States'),
  ('Massachusetts Institute of Technology', ST_SetSRID(ST_MakePoint(-71.0942, 42.3601), 4326)::geography, '@mit.edu', 'Cambridge', 'MA', 'United States'),
  ('Harvard University', ST_SetSRID(ST_MakePoint(-71.1167, 42.3770), 4326)::geography, '@harvard.edu', 'Cambridge', 'MA', 'United States');

-- Insert sample verified prayer spaces
INSERT INTO prayer_spaces (name, location, university_id, space_type, description, is_verified, verification_status) VALUES
  (
    'Maloney 4th Floor Prayer Room',
    ST_SetSRID(ST_MakePoint(-71.1680, 42.3360), 4326)::geography,
    (SELECT id FROM universities WHERE name = 'Boston College'),
    'campus',
    'Quiet prayer room on the 4th floor of Maloney Hall. Bring your own prayer rug.',
    true,
    'approved'
  ),
  (
    'O''Neill Library Basement',
    ST_SetSRID(ST_MakePoint(-71.1685, 42.3352), 4326)::geography,
    (SELECT id FROM universities WHERE name = 'Boston College'),
    'campus',
    'Meditation room available for prayer in the basement level.',
    true,
    'approved'
  ),
  (
    'MIT Muslim Chaplain Room',
    ST_SetSRID(ST_MakePoint(-71.0940, 42.3598), 4326)::geography,
    (SELECT id FROM universities WHERE name = 'Massachusetts Institute of Technology'),
    'campus',
    'Dedicated prayer space managed by the Muslim Chaplain office.',
    true,
    'approved'
  );

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE universities IS 'List of supported universities/colleges';
COMMENT ON TABLE prayer_spaces IS 'Physical locations where prayers can be held';
COMMENT ON TABLE prayer_sessions IS 'Scheduled prayer events';
COMMENT ON TABLE session_attendees IS 'Many-to-many relationship between users and prayer sessions';

COMMENT ON COLUMN users.expo_push_token IS 'Expo push notification token';
COMMENT ON COLUMN users.notification_preferences IS 'JSONB object with notification settings';
COMMENT ON COLUMN universities.location IS 'Campus center coordinates (PostGIS POINT)';
COMMENT ON COLUMN universities.email_domain IS 'Email domain for student verification (e.g., @bc.edu)';
COMMENT ON COLUMN prayer_spaces.verification_status IS 'Approval status for user-submitted spaces';
COMMENT ON COLUMN prayer_sessions.custom_location IS 'GPS location if user selected "current location"';
COMMENT ON COLUMN prayer_sessions.is_active IS 'False after prayer time passes (auto-deactivated)';
