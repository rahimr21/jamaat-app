-- Migration: Add pagination support to get_sessions_within_radius
-- Changes limit from 50 to support cursor-based pagination

-- Drop and recreate the function with updated default limit
CREATE OR REPLACE FUNCTION get_sessions_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 3218,
  from_time TIMESTAMPTZ DEFAULT NOW(),
  limit_count INTEGER DEFAULT 20  -- Changed from 50 to 20 for pagination
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
  ORDER BY ps.scheduled_time ASC, ps.id ASC  -- Added id for stable cursor
  LIMIT limit_count;
END;
$$;

-- Grant execute permission (re-grant after recreate)
GRANT EXECUTE ON FUNCTION get_sessions_within_radius TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_sessions_within_radius IS 
  'Returns prayer sessions within a radius of the given coordinates. 
   Use from_time as cursor for pagination (pass last session scheduled_time).
   Default limit is 20 for pagination support.';
