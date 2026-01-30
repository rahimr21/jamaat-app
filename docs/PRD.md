# Product Requirements Document: Jamaat

## 1. Project Overview

### 1.1 Product Name
**Jamaat** - A mobile application for coordinating congregational prayers (Jama'ah)

### 1.2 Problem Statement
Muslim students and community members currently use fragmented group chats to coordinate prayer times and locations. This leads to:
- Message overload and missed coordination
- Difficulty tracking who's attending which prayer
- No centralized view of upcoming prayer gatherings
- Inefficient communication across multiple platforms

### 1.3 Solution
Jamaat provides a streamlined mobile app where users can:
- Create prayer sessions at specific locations and times
- Browse and join upcoming prayer sessions
- See real-time attendee counts
- Receive notifications when prayers are scheduled near them
- Access daily prayer times based on their location

### 1.4 Target Users
- **Primary**: Muslim university students organizing on-campus prayers
- **Secondary**: Muslim community members coordinating prayers at masjids, community centers, and public spaces

### 1.5 Success Metrics
- Daily active users (DAU)
- Prayer sessions created per day
- Average attendees per session
- User retention rate (7-day, 30-day)
- Time from app open to joining a prayer (<30 seconds target)

---

## 2. Tech Stack

### 2.1 Frontend
- **Framework**: React Native with Expo (SDK 51+)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API + Zustand (for global state)
- **Maps**: React Native Maps (wraps Google Maps/Apple Maps)
- **Date/Time**: date-fns (lightweight, TypeScript-first)

### 2.2 Backend & Infrastructure
- **Backend-as-a-Service**: Supabase
  - PostgreSQL database with PostGIS extension (for geospatial queries)
  - Built-in authentication
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Storage (for future profile pictures)
- **Hosting**: Supabase cloud (automatic scaling)

### 2.3 External APIs
- **Prayer Times**: [Aladhan API](https://aladhan.com/prayer-times-api)
  - Endpoint: `https://api.aladhan.com/v1/timings`
  - Method: `timingsByCity` or `timings` (lat/lng)
  - Rate Limit: 100 requests/minute (more than sufficient)
- **Maps/Geocoding**: Google Maps Platform
  - Places API (location search)
  - Geocoding API (address to lat/lng conversion)
  - Maps SDK (map rendering - via React Native Maps)
- **Push Notifications**: Expo Push Notifications
  - Server: Expo's notification service
  - Client: expo-notifications

### 2.4 Development Tools
- **IDE**: Cursor with Supabase MCP server
- **Version Control**: Git + GitHub
- **Package Manager**: npm
- **Testing**: Jest + React Native Testing Library
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript compiler

---

## 3. Database Schema

### 3.1 Supabase Tables

#### `users` (extends Supabase auth.users)
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  display_name TEXT NOT NULL,
  is_student BOOLEAN DEFAULT false,
  university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
  expo_push_token TEXT, -- for notifications
  notification_preferences JSONB DEFAULT '{"new_prayers": true, "prayer_joined": true, "daily_reminders": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_university ON users(university_id);
CREATE INDEX idx_users_expo_token ON users(expo_push_token);
```

#### `universities`
```sql
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location GEOGRAPHY(POINT, 4326), -- campus center coordinates
  email_domain TEXT, -- e.g., "@bc.edu" for verification
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'United States',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_universities_name ON universities(name);
CREATE INDEX idx_universities_location ON universities USING GIST(location);
```

#### `prayer_spaces`
```sql
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prayer_spaces_university ON prayer_spaces(university_id);
CREATE INDEX idx_prayer_spaces_location ON prayer_spaces USING GIST(location);
CREATE INDEX idx_prayer_spaces_verified ON prayer_spaces(is_verified);
CREATE INDEX idx_prayer_spaces_creator ON prayer_spaces(created_by);
```

#### `prayer_sessions`
```sql
CREATE TABLE public.prayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_space_id UUID REFERENCES prayer_spaces(id) ON DELETE CASCADE,
  custom_location GEOGRAPHY(POINT, 4326), -- for "current location" option
  custom_location_name TEXT, -- optional label
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
  CONSTRAINT future_scheduled_time CHECK (scheduled_time > created_at)
);

CREATE INDEX idx_prayer_sessions_space ON prayer_sessions(prayer_space_id);
CREATE INDEX idx_prayer_sessions_time ON prayer_sessions(scheduled_time) WHERE is_active = true;
CREATE INDEX idx_prayer_sessions_creator ON prayer_sessions(created_by);
CREATE INDEX idx_prayer_sessions_prayer_type ON prayer_sessions(prayer_type);
CREATE INDEX idx_prayer_sessions_location ON prayer_sessions USING GIST(custom_location);
CREATE INDEX idx_prayer_sessions_active ON prayer_sessions(is_active, scheduled_time);
```

#### `session_attendees`
```sql
CREATE TABLE public.session_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES prayer_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_attendees_session ON session_attendees(session_id);
CREATE INDEX idx_session_attendees_user ON session_attendees(user_id);
```

### 3.2 Database Functions

#### Get sessions within radius
```sql
CREATE OR REPLACE FUNCTION get_sessions_within_radius(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 3218, -- 2 miles
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
  is_attending BOOLEAN,
  notes TEXT,
  created_by_name TEXT
) AS $$
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
    COUNT(sa.id) as attendee_count,
    false as is_attending, -- will be overridden by client for current user
    ps.notes,
    u.display_name as created_by_name
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
  GROUP BY ps.id, psp.name, psp.space_type, psp.location, ps.custom_location, ps.custom_location_name, u.display_name
  ORDER BY ps.scheduled_time ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;
```

#### Auto-deactivate past sessions (scheduled via pg_cron or Edge Function)
```sql
CREATE OR REPLACE FUNCTION deactivate_past_sessions()
RETURNS void AS $$
BEGIN
  UPDATE prayer_sessions
  SET is_active = false
  WHERE scheduled_time < NOW() - INTERVAL '30 minutes'
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;
```

### 3.3 Row Level Security (RLS) Policies

#### `users` table
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (for attendee lists)
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

#### `universities` table
```sql
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

-- Anyone can read universities
CREATE POLICY "Universities are publicly readable"
  ON universities FOR SELECT
  USING (true);

-- Only admins can insert/update (future feature)
```

#### `prayer_spaces` table
```sql
ALTER TABLE prayer_spaces ENABLE ROW LEVEL SECURITY;

-- Users can view verified spaces OR spaces they created
CREATE POLICY "Users can view verified or own spaces"
  ON prayer_spaces FOR SELECT
  USING (is_verified = true OR created_by = auth.uid());

-- Authenticated users can create spaces
CREATE POLICY "Authenticated users can create spaces"
  ON prayer_spaces FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Users can update their own unverified spaces
CREATE POLICY "Users can update own unverified spaces"
  ON prayer_spaces FOR UPDATE
  USING (created_by = auth.uid() AND is_verified = false);
```

#### `prayer_sessions` table
```sql
ALTER TABLE prayer_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view active sessions
CREATE POLICY "Anyone can view active sessions"
  ON prayer_sessions FOR SELECT
  USING (is_active = true AND is_cancelled = false);

-- Authenticated users can create sessions
CREATE POLICY "Authenticated users can create sessions"
  ON prayer_sessions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Users can update/cancel their own sessions
CREATE POLICY "Users can update own sessions"
  ON prayer_sessions FOR UPDATE
  USING (created_by = auth.uid());
```

#### `session_attendees` table
```sql
ALTER TABLE session_attendees ENABLE ROW LEVEL SECURITY;

-- Anyone can view attendees
CREATE POLICY "Anyone can view attendees"
  ON session_attendees FOR SELECT
  USING (true);

-- Users can join sessions (insert their own attendance)
CREATE POLICY "Users can join sessions"
  ON session_attendees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can leave sessions (delete their own attendance)
CREATE POLICY "Users can leave sessions"
  ON session_attendees FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow
1. **Email/Phone Authentication** (Supabase Auth)
   - Email: magic link or password-based
   - Phone: OTP via SMS (Twilio integration in Supabase)
2. **Session Management**
   - JWT tokens stored in Expo SecureStore
   - Automatic refresh token handling via Supabase client
3. **Optional Student Verification**
   - Users enter .edu email
   - Send verification link
   - On verification, set `is_student = true` and link to university

### 4.2 Authorization Levels
- **Unauthenticated**: Can view app (read-only feed), but must sign in to create/join
- **Authenticated User**: Can create sessions, join sessions, submit prayer spaces
- **Verified Student**: Badge shown in UI, prioritized in campus feeds
- **Moderator** (future): Can verify/reject prayer space submissions

### 4.3 Security Requirements
- All database operations go through RLS policies
- API keys stored in environment variables (never committed to git)
- Supabase service role key NEVER used in client
- JWT tokens expire after 1 hour (refresh tokens valid for 7 days)

---

## 5. API Integrations

### 5.1 Aladhan Prayer Times API

#### Endpoint
```
GET https://api.aladhan.com/v1/timings/{timestamp}
```

#### Parameters
- `latitude`: User's current latitude
- `longitude`: User's current longitude
- `method`: Calculation method (default: 2 = ISNA)
- `school`: Juristic school (default: 0 = Shafi)

#### Response Example
```json
{
  "data": {
    "timings": {
      "Fajr": "05:45",
      "Dhuhr": "12:15",
      "Asr": "15:30",
      "Maghrib": "18:45",
      "Isha": "20:00"
    },
    "date": {
      "gregorian": {
        "date": "29-01-2026"
      }
    }
  }
}
```

#### Implementation Notes
- Cache prayer times locally for the day (refresh at midnight)
- Store in AsyncStorage with expiry timestamp
- Fallback to previous day's times if API fails
- Rate limit: 100 req/min (use cautiously, don't call on every screen render)

#### Error Handling
- Network error: Use cached times, show warning banner
- Invalid coordinates: Prompt user to enable location
- API down: Show "Prayer times unavailable" with contact support link

### 5.2 Google Maps Platform

#### APIs Used
1. **Places API (Autocomplete)**
   - For searching campus buildings/locations
   - Restrict to university bounds (use location bias)
   
2. **Geocoding API**
   - Convert addresses to lat/lng when creating prayer spaces
   
3. **Maps SDK**
   - Render maps via React Native Maps
   - Show prayer session markers

#### Implementation Notes
- **API Key Security**: Use separate keys for Android/iOS with platform restrictions
- **Places API**: Restrict to `types=establishment` to avoid residential addresses
- **Rate Limiting**: Cache search results, debounce autocomplete queries (300ms)

#### Quotas
- Places Autocomplete: $2.83 per 1000 requests (free $200/month credit)
- Geocoding: $5 per 1000 requests
- Maps SDK: Free for mobile apps

### 5.3 Expo Push Notifications

#### Server-Side (Supabase Edge Function)
```typescript
// Send notification when prayer session created
const sendPushNotification = async (expoPushToken: string, message: string) => {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: expoPushToken,
      sound: 'default',
      title: 'New Prayer Session',
      body: message,
      data: { sessionId: '...' },
    }),
  });
  return response.json();
};
```

#### Client-Side (React Native)
```typescript
import * as Notifications from 'expo-notifications';

// Request permission
const { status } = await Notifications.requestPermissionsAsync();

// Get Expo push token
const token = (await Notifications.getExpoPushTokenAsync()).data;

// Save to database
await supabase.from('users').update({ expo_push_token: token });
```

#### Notification Triggers
1. **New prayer near user**: When session created within 2 miles
2. **Someone joins your prayer**: When attendee count increases
3. **Prayer reminder** (optional): 15 minutes before scheduled time
4. **Prayer space approved**: When submitted space is verified

---

## 6. Security & Privacy

### 6.1 Input Validation

#### Client-Side Validation (TypeScript + Zod)
```typescript
import { z } from 'zod';

const createSessionSchema = z.object({
  prayer_type: z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah']),
  scheduled_time: z.date().min(new Date(), "Cannot schedule prayer in the past"),
  prayer_space_id: z.string().uuid().optional(),
  custom_location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  notes: z.string().max(500).optional(),
}).refine(data => 
  (data.prayer_space_id && !data.custom_location) || 
  (!data.prayer_space_id && data.custom_location),
  { message: "Must provide either prayer_space_id or custom_location" }
);
```

#### Server-Side Validation (Database Constraints)
- All constraints defined in schema (CHECK, UNIQUE, NOT NULL)
- Additional validation in Supabase Edge Functions for complex logic
- SQL injection prevention via parameterized queries (Supabase client handles this)

### 6.2 Rate Limiting

#### Database Level (Supabase)
```sql
-- Prevent spam: max 10 sessions per user per day
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
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 sessions per day';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_session_rate_limit
  BEFORE INSERT ON prayer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION check_session_creation_limit();
```

#### API Level
- Supabase: Built-in rate limiting (100 req/10 sec per IP)
- Aladhan API: 100 req/min (sufficient for app needs)
- Google Maps: Set daily quotas in GCP console

#### Application Level
- Debounce search queries (300ms)
- Throttle location updates (max 1/minute)
- Cache prayer times (refresh daily)

### 6.3 API Key Management

#### Environment Variables (.env)
```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (safe to expose)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (NEVER in client, server-only)

# Google Maps
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=AIzaSy...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS=AIzaSy...

# Expo
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

#### Key Restrictions (Google Cloud Console)
- **Android key**: Restrict to app SHA-1 fingerprint
- **iOS key**: Restrict to bundle identifier
- **API restrictions**: Enable only Places, Geocoding, Maps SDK

#### Storage
- Use `expo-secure-store` for JWT tokens
- NEVER log or expose API keys in code
- Add `.env` to `.gitignore`

### 6.4 Data Privacy

#### User Data Handling
- **Minimal data collection**: Only essential fields (name, email/phone)
- **Location data**: Only stored for active sessions, not historical tracking
- **No third-party analytics** in MVP (add later with consent)

#### Privacy Policy Requirements
- Explain what data is collected (email, location during session creation)
- Explain how data is used (coordinating prayers, notifications)
- Explain user rights (delete account, export data)
- Link in app settings and app store listings

#### GDPR/CCPA Compliance (Future)
- Account deletion: CASCADE deletes all user data
- Data export: Supabase API query to get all user's data
- Right to be forgotten: Anonymize user in old sessions (don't delete sessions)

---

## 7. User Interface Design

### 7.1 Design Principles
- **Minimalist**: Clean, uncluttered interface (inspired by iOS Human Interface Guidelines)
- **Fast**: Max 2 taps to create/join a prayer
- **Accessible**: Min 16px font, 44x44pt touch targets, high contrast
- **Islamic aesthetics**: Subtle Islamic patterns (optional), green accent color (#28A745)

### 7.2 Color Palette
```typescript
const colors = {
  primary: '#28A745',      // Green (Islamic symbolism)
  primaryDark: '#1E7B34',  // Darker green for active states
  secondary: '#6C757D',    // Gray for secondary text
  background: '#FFFFFF',   // White background
  surface: '#F8F9FA',      // Light gray for cards
  text: '#212529',         // Near-black for body text
  textLight: '#6C757D',    // Gray for secondary text
  border: '#DEE2E6',       // Light gray for borders
  error: '#DC3545',        // Red for errors
  success: '#28A745',      // Green for success states
  warning: '#FFC107',      // Yellow for warnings
};
```

### 7.3 Typography
```typescript
const typography = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
};
```

### 7.4 Component Specifications

#### Prayer Session Card
```typescript
// Dimensions: Full width - 32px margin (16px each side)
// Height: Auto (min 120px)
<Card>
  <Header>
    <PrayerType>Dhuhr</PrayerType> // h3, primary color
    <Time>12:30 PM</Time> // body, text color
  </Header>
  <Location>
    <Icon>📍</Icon>
    <Text>Maloney 4th Floor</Text> // bodySmall, textLight
  </Location>
  <Attendees>
    <AvatarGroup>👤👤👤</AvatarGroup> // Show max 3, then "+5"
    <Count>8 attending</Count> // bodySmall, textLight
  </Attendees>
  <Actions>
    <JoinButton>Join</JoinButton> // Full width, primary color
  </Actions>
</Card>
```

#### Create Prayer Button (FAB)
```typescript
// Position: Bottom right, 16px from edges
// Size: 56x56px circle
// Icon: "+" (white, 24px)
// Background: Primary color with shadow
// On press: Navigate to CreateSessionScreen
<FloatingActionButton>
  <Icon name="plus" size={24} color="white" />
</FloatingActionButton>
```

#### Prayer Times Display
```typescript
// Layout: Horizontal scroll (if needed) or vertical list
// Show current prayer highlighted with green background
<PrayerTimesContainer>
  <PrayerTimeItem active={currentPrayer === 'asr'}>
    <Name>Asr</Name> // caption, uppercase
    <Time>3:30 PM</Time> // body, bold if active
  </PrayerTimeItem>
  {/* Repeat for all 5 prayers */}
</PrayerTimesContainer>
```

### 7.5 Screen Layouts

#### Onboarding Flow
1. **Welcome Screen**: Logo, tagline, "Get Started" button
2. **Auth Screen**: Email/phone input, "Continue" button
3. **Student Opt-in**: "Are you a student?" → Yes/Skip
4. **University Selection**: Searchable list
5. **Notification Permission**: System dialog

#### Main Feed Screen
```
┌─────────────────────────────────┐
│ [Logo] Jamaat      [⚙️ Settings]│ <- Header (60px height)
├─────────────────────────────────┤
│ 📍 Boston College   [Change] ▼  │ <- Location selector (48px)
├─────────────────────────────────┤
│ ┌─ Today's Prayer Times ───────┐│
│ │ Fajr  5:45  Dhuhr 12:15  ... ││ <- Horizontal scroll (80px)
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Upcoming Prayers               ↓│ <- Section header (40px)
│                                  │
│ [Prayer Session Card 1]          │ <- 120px min height
│ [Prayer Session Card 2]          │
│ [Prayer Session Card 3]          │
│                                  │
│               [+ FAB] ──────────►│ <- Floating (bottom right)
└─────────────────────────────────┘
```

#### Create Session Screen
```
┌─────────────────────────────────┐
│ [←] Create Prayer Session       │ <- Header with back button
├─────────────────────────────────┤
│ Prayer Type                     ↓│
│ [Fajr][Dhuhr][Asr][Maghrib][Isha]│ <- Chip selector (48px)
├─────────────────────────────────┤
│ Location                        ↓│
│ ⦿ Campus Prayer Space            │ <- Radio group (200px total)
│   [Select from list ▼]           │
│ ○ My Current Location            │
├─────────────────────────────────┤
│ Time                            ↓│
│ [📅 Today ▼] [🕐 3:30 PM ▼]     │ <- Date + time pickers (56px)
├─────────────────────────────────┤
│ Notes (optional)                ↓│
│ [Text input: max 500 chars]      │ <- Multiline input (100px min)
├─────────────────────────────────┤
│                                  │
│      [Create Session] ──────────►│ <- Primary button (56px)
└─────────────────────────────────┘
```

### 7.6 Animations & Interactions
- **Card tap**: Scale down 0.98x, then navigate
- **Join button**: Color change + haptic feedback
- **FAB tap**: Rotate 45° (+ becomes ×), expand sheet
- **Pull to refresh**: Standard iOS/Android pattern
- **Loading states**: Skeleton screens (not spinners)
- **Empty states**: Illustration + "No prayers scheduled yet" + CTA

---

## 8. Feature Requirements

### 8.1 MVP (Version 1.0) - Must Have

#### Authentication (Priority: Critical)
- [ ] Email sign-up with magic link
- [ ] Phone sign-up with OTP
- [ ] Persist session with JWT in SecureStore
- [ ] Auto-refresh expired tokens
- [ ] Profile creation (display name)
- [ ] Optional student verification (.edu email)
- [ ] University selection (searchable list)

#### Core Prayer Session Features (Priority: Critical)
- [ ] View feed of upcoming prayer sessions
- [ ] Filter by location (campus/radius)
- [ ] Create prayer session
  - [ ] Select prayer type (Fajr/Dhuhr/Asr/Maghrib/Isha/Jummah)
  - [ ] Choose location (preset space OR current location)
  - [ ] Set time (date + time picker)
  - [ ] Add optional notes (max 500 chars)
- [ ] Join prayer session (add self to attendees)
- [ ] Leave prayer session (remove self from attendees)
- [ ] View attendee list (names + count)
- [ ] Real-time attendee count updates (Supabase Realtime)

#### Prayer Times Integration (Priority: Critical)
- [ ] Fetch daily prayer times from Aladhan API
- [ ] Display times in feed header
- [ ] Highlight current prayer
- [ ] Cache times locally (refresh at midnight)
- [ ] Auto-suggest prayer time when creating session

#### Location Features (Priority: Critical)
- [ ] Request location permission
- [ ] Get user's current coordinates
- [ ] Display sessions within 2-mile radius
- [ ] Show distance to each session
- [ ] Campus prayer space selector (preset list)
- [ ] "Current location" option for custom spots

#### Notifications (Priority: High)
- [ ] Request notification permission
- [ ] Get Expo push token
- [ ] Save token to database
- [ ] Send notification when prayer created near user
- [ ] Send notification when someone joins user's prayer
- [ ] Notification preferences in settings

#### Settings (Priority: High)
- [ ] Edit profile (display name)
- [ ] Change university
- [ ] Toggle notification preferences
- [ ] View app version
- [ ] Log out

### 8.2 Post-MVP (Version 1.1+) - Should Have

#### Enhanced Location Features (Priority: Medium)
- [ ] User-submitted prayer spaces
  - [ ] Submit new campus location
  - [ ] Admin/moderator approval flow
  - [ ] Verification status (pending/approved/rejected)
- [ ] Location search with Google Places API
- [ ] Map view of nearby prayers
- [ ] Save favorite locations

#### Social Features (Priority: Medium)
- [ ] User profiles with bio
- [ ] Prayer history ("Prayed together 5 times")
- [ ] Follow users to see their prayers
- [ ] In-app messaging (chat with attendees)
- [ ] Reputation system (verified attender badge)

#### Recurring Prayers (Priority: Medium)
- [ ] Create recurring prayer (e.g., "Every Friday 1 PM Jummah")
- [ ] Auto-generate sessions from recurrence pattern
- [ ] Edit/delete recurrence series

#### Advanced Notifications (Priority: Low)
- [ ] Daily prayer time reminders (15 min before)
- [ ] Digest notification (e.g., "3 prayers scheduled tomorrow")
- [ ] Custom notification radius

#### Community Features (Priority: Low)
- [ ] Campus/community moderators
- [ ] Report inappropriate content
- [ ] Masjid partnerships (official prayer times)
- [ ] Prayer space photos

### 8.3 Future Considerations (Version 2.0+)

- [ ] Web app (Expo Web support)
- [ ] Qibla finder (compass)
- [ ] Islamic calendar integration (Ramadan times, Eid prayers)
- [ ] Multilingual support (Arabic, Urdu, Turkish, etc.)
- [ ] Accessibility features (VoiceOver, TalkBack)
- [ ] Analytics dashboard (for admins)
- [ ] In-app feedback system
- [ ] Prayer space reviews/ratings
- [ ] Integration with calendar apps (Google Calendar, Apple Calendar)

---

## 9. User Flows

### 9.1 First-Time User Journey

```
1. Download app from App Store/Google Play
   ↓
2. Open app → Welcome screen
   ↓
3. Tap "Get Started"
   ↓
4. Choose sign-up method (Email or Phone)
   ↓
5. Enter email/phone → Receive magic link/OTP
   ↓
6. Verify → Enter display name
   ↓
7. "Are you a student?" → Tap "Yes"
   ↓
8. Search and select university (e.g., "Boston College")
   ↓
9. Optional: Verify with .edu email (skip for now)
   ↓
10. System prompts for notification permission → Tap "Allow"
    ↓
11. Arrive at main feed
    ↓
12. See empty state: "No prayers scheduled yet"
    ↓
13. Tap FAB "+" button
    ↓
14. Create first prayer session
    - Select prayer type: Asr
    - Select location: Campus → "Maloney 4th Floor"
    - Set time: Today, 3:30 PM
    - Tap "Create Session"
    ↓
15. Redirected to feed → See own prayer session card
    ↓
16. Wait for others to join (notification sent to nearby users)
```

### 9.2 Returning User Journey (Joining Prayer)

```
1. Open app → Automatically logged in
   ↓
2. See feed with upcoming prayers
   ↓
3. Notice "Dhuhr · 12:30 PM · Maloney 4th Floor · 3 attending"
   ↓
4. Tap "Join" button
   ↓
5. Button changes to "Joined ✓" (green)
   ↓
6. Attendee count increases: "4 attending"
   ↓
7. Receive notification 15 mins before prayer: "Reminder: Dhuhr prayer in 15 min"
   ↓
8. Attend prayer in-person
   ↓
9. (Optional) App prompts after scheduled time: "Did you attend?"
   - Tap "Yes" → Prayer counted in history
   - Tap "No" → Feedback for future improvements
```

### 9.3 Creating a Custom Location Prayer

```
1. Tap FAB "+"
   ↓
2. Select prayer type: Maghrib
   ↓
3. Select location: "My Current Location"
   ↓
4. System requests location permission (if not granted)
   ↓
5. Current location auto-filled (lat/lng)
   ↓
6. Optional: Add custom name "Near Starbucks on Main St"
   ↓
7. Set time: Today, 6:45 PM
   ↓
8. Add note: "We'll pray in the park area"
   ↓
9. Tap "Create Session"
   ↓
10. Session appears in feed with distance indicator
    ↓
11. Other users within 2 miles see notification
```

### 9.4 Submitting New Prayer Space (Post-MVP)

```
1. Settings → "Manage Campus Prayer Spaces"
   ↓
2. Tap "Add New Space"
   ↓
3. Fill form:
   - Space name: "Higgins Hall 3rd Floor"
   - Building: "Higgins Hall"
   - University: "Boston College" (pre-filled)
   - Description: "Quiet room near elevators"
   ↓
4. Optional: Pin location on map
   ↓
5. Tap "Submit for Review"
   ↓
6. See status: "Pending verification"
   ↓
7. Only submitter can use space to create sessions (while pending)
   ↓
8. Admin approves → Space becomes available to all BC students
   ↓
9. Submitter receives notification: "Your prayer space was approved!"
```

---

## 10. Error Handling & Edge Cases

### 10.1 Network Errors

#### No Internet Connection
- **Detection**: Monitor `NetInfo` state
- **Behavior**: 
  - Show offline banner at top of screen
  - Queue write operations (create/join session)
  - Sync when connection restored
- **User Message**: "You're offline. Changes will sync when reconnected."

#### API Timeout
- **Supabase**: Default timeout 10s
- **Aladhan API**: Timeout 5s
- **Behavior**: Retry with exponential backoff (1s, 2s, 4s)
- **User Message**: "Taking longer than usual. Retrying..."

#### Server Error (500)
- **Behavior**: Show error state, offer "Try Again" button
- **User Message**: "Something went wrong. Please try again."

### 10.2 Location Errors

#### Permission Denied
- **Behavior**: Show modal explaining why location is needed
- **User Message**: "Location access is required to find nearby prayers. Go to Settings?"
- **Actions**: [Open Settings] [Cancel]

#### Location Unavailable (GPS off)
- **Behavior**: Fallback to manual location entry
- **User Message**: "Can't get your location. Please select manually."

#### Inaccurate Location (Low accuracy)
- **Behavior**: Request high-accuracy location
- **User Message**: "Getting precise location..." (show spinner)

### 10.3 Authentication Errors

#### Invalid Magic Link
- **Behavior**: Show error, offer to resend
- **User Message**: "This link has expired. Request a new one?"

#### Rate Limited (Too many OTP requests)
- **Behavior**: Show countdown timer
- **User Message**: "Too many attempts. Try again in 5:00"

#### Email Already Exists
- **Behavior**: Redirect to login
- **User Message**: "This email is already registered. Sign in instead?"

### 10.4 Data Validation Errors

#### Past Scheduled Time
- **Behavior**: Prevent submission, show inline error
- **User Message**: "Cannot schedule prayer in the past"

#### No Location Selected
- **Behavior**: Disable "Create" button until location chosen
- **User Message**: "Please select a location"

#### Notes Too Long (>500 chars)
- **Behavior**: Show character count, disable submission
- **User Message**: "Notes must be under 500 characters (currently 523)"

### 10.5 Edge Cases

#### User Joins Own Prayer
- **Behavior**: Automatically mark creator as attending (no "Join" button)
- **UI**: Show "You created this prayer" instead

#### Session Time Passes Before User Joins
- **Behavior**: Disable "Join" button, show "Prayer time passed"
- **Background**: Scheduled job marks session as `is_active = false`

#### Multiple Users Join Simultaneously
- **Behavior**: Supabase handles concurrency with UNIQUE constraint
- **UI**: Optimistic update (immediate feedback), rollback if fails

#### Creator Cancels Prayer
- **Behavior**: Set `is_cancelled = true`, notify all attendees
- **Notification**: "The Dhuhr prayer at 12:30 PM has been cancelled"

#### User in Area with No Sessions
- **Behavior**: Show empty state with illustration
- **UI**: "No prayers scheduled nearby. Be the first!" + [Create Prayer]

#### User Changes Time Zone
- **Behavior**: Prayer times update based on new location
- **Implementation**: Re-fetch from Aladhan API with new coordinates

---

## 11. Performance Requirements

### 11.1 Load Times
- **App launch**: <2 seconds to splash screen dismissal
- **Feed load**: <1 second to display cached data, <3 seconds to fetch fresh data
- **Session creation**: <500ms to submit, <1 second to appear in feed
- **Prayer times fetch**: <2 seconds (cached for 24 hours)

### 11.2 Optimization Strategies

#### Database
- Indexes on frequently queried columns (see schema)
- Pagination for feed (load 20 sessions at a time, infinite scroll)
- Realtime subscriptions only for current view (unsubscribe on navigate away)

#### Caching
- Prayer times: Cache in AsyncStorage (key: `prayer_times_${date}`)
- University list: Cache in AsyncStorage (refresh weekly)
- User profile: Cache in memory (Zustand store)
- Images: Use `expo-image` with disk + memory cache

#### Code Splitting
- Lazy load screens with React.lazy()
- Separate bundle for heavy features (map view)

#### Assets
- Optimize images (WebP format, max 2x resolution)
- Use SVG for icons (via react-native-svg)
- Compress fonts (only Latin + Arabic characters)

### 11.3 Monitoring

#### Key Metrics to Track
- Time to Interactive (TTI)
- API response times (P50, P95, P99)
- Crash-free rate (target: >99.5%)
- ANR (Application Not Responding) rate (target: <0.1%)

#### Tools
- Sentry (error tracking)
- Expo Analytics (built-in, basic metrics)
- Firebase Performance Monitoring (optional)

---

## 12. Testing Requirements

### 12.1 Unit Tests (Jest)
- **Coverage target**: 70% for core logic
- **Priority areas**:
  - Date/time utilities (prayer time calculations)
  - Validation schemas (Zod)
  - Helper functions (distance calculation)

### 12.2 Integration Tests
- **Supabase operations**:
  - Create session → verify in database
  - Join session → verify attendee record
  - RLS policies → ensure unauthorized access blocked
- **API calls**:
  - Mock Aladhan API responses
  - Test error handling (network failures)

### 12.3 End-to-End Tests (Detox)
- **Critical flows**:
  1. Sign up → Create session → Join session
  2. View feed → Filter by location → Tap session details
  3. Enable notifications → Receive notification → Open app

### 12.4 Manual Testing Checklist

#### Pre-Release
- [ ] Test on iOS physical device (iPhone 12+, iOS 16+)
- [ ] Test on Android physical device (Pixel 5+, Android 12+)
- [ ] Test on slow network (3G simulation)
- [ ] Test in airplane mode (offline behavior)
- [ ] Test with location services disabled
- [ ] Test with notifications disabled
- [ ] Test edge cases (past sessions, empty feed, etc.)

#### Accessibility
- [ ] VoiceOver (iOS) navigation
- [ ] TalkBack (Android) navigation
- [ ] Color contrast (WCAG AA)
- [ ] Font scaling (up to 200%)

---

## 13. Deployment & Release

### 13.1 Development Environment
- **Branch strategy**: `main` (production), `develop` (staging)
- **Pre-commit hooks**: ESLint + Prettier (via Husky)
- **CI/CD**: GitHub Actions
  - Run tests on PR
  - Build app on merge to `main`
  - Upload to Expo EAS

### 13.2 Expo Application Services (EAS)

#### Build Configuration (eas.json)
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "123456789",
        "appleTeamId": "ABCDE12345"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account.json",
        "track": "internal"
      }
    }
  }
}
```

#### Build Commands
```bash
# Development build (for testing on device)
eas build --profile development --platform ios

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform all
```

### 13.3 App Store Preparation

#### iOS App Store
- **App Name**: Jamaat
- **Bundle ID**: com.yourcompany.jamaat
- **Category**: Social Networking (or Lifestyle)
- **Content Rating**: 4+ (no objectionable content)
- **Screenshots**: 6.7", 6.5", 5.5" (iPhone), 12.9" (iPad)
- **Privacy Policy**: Required (host on website)
- **App Review Notes**: "Test account: test@example.com, password: test123"

#### Google Play Store
- **Package Name**: com.yourcompany.jamaat
- **Category**: Social
- **Content Rating**: ESRB Everyone
- **Target SDK**: 34 (Android 14)
- **Screenshots**: Phone, 7" tablet, 10" tablet
- **Feature Graphic**: 1024x500px

### 13.4 Versioning Strategy
- **Semantic versioning**: MAJOR.MINOR.PATCH
- **Example**: 1.0.0 (initial release) → 1.1.0 (new features) → 1.1.1 (bug fixes)
- **Build number**: Auto-increment via EAS

### 13.5 Release Checklist

#### Pre-Launch (1 week before)
- [ ] Beta test with 10-20 users on TestFlight/Internal Testing
- [ ] Fix critical bugs from beta feedback
- [ ] Finalize app store assets (screenshots, descriptions)
- [ ] Submit privacy policy to legal review (if applicable)
- [ ] Prepare press release / social media posts

#### Launch Day
- [ ] Submit to App Store & Google Play
- [ ] Monitor crash reports (Sentry)
- [ ] Respond to user reviews
- [ ] Post on social media (Twitter, Instagram, LinkedIn)
- [ ] Email university MSA (Muslim Student Association) groups

#### Post-Launch (1 week after)
- [ ] Analyze usage metrics (DAU, retention)
- [ ] Gather user feedback (in-app survey?)
- [ ] Plan hotfix if needed (critical bugs)
- [ ] Start planning v1.1 features based on feedback

---

## 14. Success Criteria

### 14.1 Launch Metrics (Month 1)
- **Downloads**: 200+ (initial campus)
- **Active Users**: 50+ DAU
- **Sessions Created**: 100+ total
- **Avg Attendees/Session**: 3+
- **Retention (7-day)**: 40%+

### 14.2 Growth Metrics (Month 3)
- **Downloads**: 1,000+ (multiple campuses)
- **Active Users**: 300+ DAU
- **Sessions Created**: 50+ per day
- **Avg Attendees/Session**: 5+
- **Retention (30-day)**: 25%+

### 14.3 Quality Metrics (Ongoing)
- **Crash-free rate**: 99.5%+
- **App Store rating**: 4.5+ stars
- **Response time**: <3s for all API calls
- **NPS (Net Promoter Score)**: 50+ (track via in-app survey)

---

## 15. Risks & Mitigations

### 15.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Supabase outage | Low | High | Cache data locally, queue writes, retry on reconnect |
| Google Maps quota exceeded | Medium | Medium | Set daily quotas, use free tier efficiently, fallback to text-only view |
| Expo build failures | Medium | Low | Test builds frequently, maintain clean dependencies |
| Real-time updates fail | Low | Medium | Fallback to polling every 30s, show stale data warning |

### 15.2 Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low user adoption | Medium | High | Launch at multiple campuses simultaneously, partner with MSAs |
| Spam/fake sessions | Medium | Medium | Rate limiting, user reporting, manual moderation initially |
| No-shows (people join but don't attend) | High | Medium | Social accountability (show who attended), reputation system later |
| Privacy concerns (location tracking) | Low | High | Clear privacy policy, only track location during session creation |

### 15.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Difficult to monetize | Medium | Low | Not a concern for MVP (free app), explore partnerships later |
| Scaling costs (Supabase) | Low | Medium | Start with free tier ($0/month), optimize queries, migrate to paid plan as needed |
| Competition (similar apps) | Low | Medium | Focus on niche (students + Muslims), better UX, community-driven |

---

## 16. Post-Launch Roadmap

### 16.1 Version 1.1 (1 month post-launch)
- User-submitted prayer spaces with moderation
- In-app feedback system
- Bug fixes based on user reports
- Performance optimizations

### 16.2 Version 1.2 (3 months post-launch)
- Map view of nearby prayers
- Recurring prayer sessions
- Enhanced notifications (digest, reminders)
- Support for 5-10 universities

### 16.3 Version 2.0 (6 months post-launch)
- User profiles with prayer history
- Follow system
- In-app messaging
- Masjid partnerships
- Web app (Expo Web)

### 16.4 Long-Term Vision
- Expand beyond US (Canada, UK, Middle East)
- Multilingual support (Arabic, Urdu, Turkish)
- Integration with Islamic calendar (Ramadan, Eid)
- Qibla finder and other utility features
- Partnerships with Islamic organizations

---

## 17. Appendix

### 17.1 Glossary

| Term | Definition |
|------|------------|
| Jama'ah | Congregational prayer (praying together in a group) |
| Salat | The five daily prayers in Islam |
| Fajr | Pre-dawn prayer |
| Dhuhr | Midday prayer |
| Asr | Afternoon prayer |
| Maghrib | Sunset prayer |
| Isha | Night prayer |
| Jummah | Friday congregational prayer (special weekly prayer) |
| Masjid | Mosque |
| MSA | Muslim Student Association |
| .edu email | University email address (e.g., student@bc.edu) |

### 17.2 References

- **Aladhan API Docs**: https://aladhan.com/prayer-times-api
- **Supabase Docs**: https://supabase.com/docs
- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Google Maps Platform**: https://developers.google.com/maps/documentation
- **Islamic Prayer Times Calculation**: https://en.wikipedia.org/wiki/Salah_times

### 17.3 Contact & Support

- **Developer**: [Your Name]
- **Email**: support@jamaat-app.com (to be created)
- **GitHub**: https://github.com/yourorg/jamaat
- **Discord**: https://discord.gg/jamaat-community (for beta testers)

---

## 18. Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Set up project infrastructure and core architecture

**Tasks**:
1. Initialize Expo project with TypeScript
2. Set up Supabase project and database schema
3. Configure authentication (email/phone)
4. Implement navigation structure (Expo Router)
5. Set up environment variables and API keys
6. Configure ESLint, Prettier, and pre-commit hooks
7. Create reusable UI components (Button, Card, Input)

**Deliverables**:
- [ ] Working Expo app that builds on iOS/Android
- [ ] Supabase database with all tables and RLS policies
- [ ] Authentication flow (sign up, login, logout)
- [ ] Base navigation (onboarding → main feed → settings)

---

### Phase 2: Core Features (Week 3-4)
**Goal**: Build MVP features (create/join sessions, view feed)

**Tasks**:
1. Implement prayer session creation screen
2. Build main feed with session cards
3. Add join/leave functionality with Realtime updates
4. Integrate Aladhan API for prayer times
5. Implement location services (GPS + permissions)
6. Add session filtering by location/university
7. Build settings screen (profile, notifications toggle)

**Deliverables**:
- [ ] Users can create prayer sessions
- [ ] Users can view feed of upcoming sessions
- [ ] Users can join/leave sessions
- [ ] Real-time attendee count updates
- [ ] Prayer times displayed in feed
- [ ] Basic settings screen

---

### Phase 3: Notifications & Polish (Week 5-6)
**Goal**: Complete MVP with notifications and UX refinements

**Tasks**:
1. Implement Expo push notifications
2. Create notification triggers (new prayer, someone joined)
3. Add notification preferences in settings
4. Implement loading states and error handling
5. Add empty states with illustrations
6. Optimize performance (caching, pagination)
7. Conduct internal testing and fix bugs

**Deliverables**:
- [ ] Push notifications working
- [ ] Smooth loading/error states
- [ ] Professional UI polish
- [ ] Stable app with <1% crash rate
- [ ] Ready for beta testing

---

### Phase 4: Beta Testing & Launch Prep (Week 7-8)
**Goal**: Test with real users and prepare for app store submission

**Tasks**:
1. Deploy to TestFlight (iOS) and Internal Testing (Android)
2. Recruit 20-30 beta testers from campus
3. Gather feedback and fix critical bugs
4. Create app store assets (screenshots, descriptions)
5. Write privacy policy and terms of service
6. Set up crash reporting (Sentry)
7. Submit to App Store and Google Play

**Deliverables**:
- [ ] Beta version tested by 20+ users
- [ ] All critical bugs fixed
- [ ] App store submissions complete
- [ ] Marketing materials ready
- [ ] Launch plan finalized

---

## 19. Development Best Practices

### 19.1 Code Organization

```
jamaat/
├── app/                        # Expo Router screens
│   ├── (auth)/                 # Auth flow (onboarding, login)
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   └── student-verification.tsx
│   ├── (tabs)/                 # Main app tabs
│   │   ├── index.tsx           # Feed (home)
│   │   ├── create.tsx          # Create session
│   │   └── settings.tsx        # Settings
│   └── _layout.tsx             # Root layout
├── components/                 # Reusable UI components
│   ├── ui/                     # Base components (Button, Input, Card)
│   ├── prayer/                 # Prayer-specific components
│   │   ├── SessionCard.tsx
│   │   ├── PrayerTimesDisplay.tsx
│   │   └── LocationPicker.tsx
│   └── common/                 # Shared components (Header, EmptyState)
├── lib/                        # Business logic & utilities
│   ├── supabase.ts             # Supabase client
│   ├── api/                    # API integrations
│   │   ├── aladhan.ts          # Prayer times API
│   │   └── notifications.ts    # Push notifications
│   ├── utils/                  # Helper functions
│   │   ├── date.ts             # Date/time utilities
│   │   ├── location.ts         # Distance calculation
│   │   └── validation.ts       # Zod schemas
│   └── hooks/                  # Custom React hooks
│       ├── useAuth.ts
│       ├── usePrayerSessions.ts
│       └── usePrayerTimes.ts
├── stores/                     # Global state (Zustand)
│   ├── authStore.ts
│   └── sessionStore.ts
├── types/                      # TypeScript types
│   ├── database.ts             # Supabase types (auto-generated)
│   └── index.ts                # Custom types
├── constants/                  # App constants
│   ├── colors.ts
│   ├── typography.ts
│   └── config.ts
└── assets/                     # Static assets
    ├── images/
    ├── fonts/
    └── icons/
```

### 19.2 Naming Conventions

- **Components**: PascalCase (e.g., `SessionCard.tsx`)
- **Functions**: camelCase (e.g., `fetchPrayerTimes()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Types**: PascalCase (e.g., `PrayerSession`, `User`)
- **Files**: kebab-case for non-components (e.g., `prayer-times.ts`)

### 19.3 Git Workflow

#### Commit Messages
Follow conventional commits format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples**:
```
feat(auth): add phone authentication with OTP

Implemented Supabase phone auth with SMS OTP verification.
Users can now sign up using their phone number.

Closes #12
```

```
fix(feed): resolve real-time subscription memory leak

Unsubscribe from Supabase Realtime channel on component unmount
to prevent memory leaks when navigating away from feed.

Fixes #45
```

#### Branch Naming
- Feature branches: `feature/description` (e.g., `feature/prayer-times-integration`)
- Bug fixes: `fix/description` (e.g., `fix/notification-crash`)
- Hotfixes: `hotfix/description` (e.g., `hotfix/login-timeout`)

### 19.4 Code Review Checklist

Before submitting a PR, ensure:
- [ ] Code follows TypeScript strict mode (no `any` types)
- [ ] All new components have PropTypes or TypeScript interfaces
- [ ] No console.logs (use proper logging library)
- [ ] Error handling implemented (try/catch, error boundaries)
- [ ] Loading states handled (skeleton screens, spinners)
- [ ] Accessibility considered (labels, contrast, touch targets)
- [ ] Tests written for new features (if applicable)
- [ ] Documentation updated (if API changed)
- [ ] No hardcoded values (use constants or env vars)
- [ ] Performance optimized (memoization, lazy loading)

---

## 20. Launch Checklist

### 20.1 Pre-Launch (1 Week Before)

#### Technical
- [ ] All critical bugs fixed (P0, P1 severity)
- [ ] App tested on 3+ iOS devices (iPhone 12, 13, 14)
- [ ] App tested on 3+ Android devices (Pixel, Samsung, OnePlus)
- [ ] Crash-free rate >99% in beta
- [ ] API rate limits configured (Supabase, Google Maps)
- [ ] Sentry error tracking set up and verified
- [ ] Push notifications tested on iOS and Android
- [ ] Database backups scheduled (Supabase auto-backup)
- [ ] Environment variables secured (no secrets in code)

#### Legal & Compliance
- [ ] Privacy policy written and hosted (use Termly or similar)
- [ ] Terms of service written and hosted
- [ ] App Store privacy details filled out (iOS)
- [ ] Google Play Data Safety section completed (Android)
- [ ] GDPR compliance reviewed (if targeting EU users)
- [ ] COPPA compliance (app is 4+, no children data collected)

#### App Store Assets
- [ ] iOS screenshots (6.7", 6.5", 5.5")
- [ ] Android screenshots (phone, 7" tablet, 10" tablet)
- [ ] App icon (1024x1024 iOS, 512x512 Android)
- [ ] Feature graphic (Google Play, 1024x500)
- [ ] App description written (3-4 paragraphs, keywords included)
- [ ] Promotional text (iOS, 170 chars)
- [ ] Keywords optimized (iOS, 100 chars max)
- [ ] Age rating determined (4+ / Everyone)
- [ ] Support URL set (website or email)

#### Marketing
- [ ] Social media accounts created (Instagram, Twitter/X)
- [ ] Landing page or website live (jamaat-app.com)
- [ ] Press release drafted
- [ ] Reach out to university MSAs (email list prepared)
- [ ] Product Hunt launch scheduled (optional)
- [ ] Reddit posts planned (r/MuslimTechNet, r/islam)

### 20.2 Launch Day

- [ ] Submit app to App Store Review (expect 24-48 hours)
- [ ] Upload APK/AAB to Google Play Internal Testing
- [ ] Promote to Internal → Closed Testing → Open Testing (gradual rollout)
- [ ] Monitor Sentry for crashes (check every hour)
- [ ] Respond to first user reviews (within 24 hours)
- [ ] Post launch announcement on social media
- [ ] Email university MSA mailing lists
- [ ] Monitor server costs (Supabase dashboard)
- [ ] Track installs and DAU (Expo Analytics)

### 20.3 Post-Launch (First Week)

- [ ] Daily crash monitoring (target: <0.5% crash rate)
- [ ] Triage user feedback (in-app, app store reviews, emails)
- [ ] Fix P0 bugs within 24 hours (push hotfix if critical)
- [ ] Analyze usage patterns (which features used most?)
- [ ] Respond to ALL app store reviews (thank + address issues)
- [ ] Share user testimonials on social media
- [ ] Plan v1.1 features based on feedback
- [ ] Write retrospective blog post (learnings, metrics)

---

## 21. Monitoring & Analytics

### 21.1 Key Metrics Dashboard

Track these metrics daily/weekly:

| Metric | Formula | Target (Month 1) | Tool |
|--------|---------|------------------|------|
| DAU | Unique users per day | 50+ | Expo Analytics |
| MAU | Unique users per month | 200+ | Expo Analytics |
| DAU/MAU Ratio | DAU ÷ MAU | 25%+ | Manual calculation |
| Sessions Created/Day | Count of new prayer sessions | 10+ | Supabase query |
| Avg Attendees/Session | Total attendees ÷ total sessions | 3+ | Supabase query |
| Retention (Day 1) | Users returning next day | 40%+ | Expo Analytics |
| Retention (Day 7) | Users returning after 7 days | 30%+ | Expo Analytics |
| Crash-Free Rate | (Sessions - Crashes) ÷ Sessions × 100 | 99.5%+ | Sentry |
| API Response Time (P95) | 95th percentile latency | <3s | Supabase metrics |

### 21.2 Supabase Queries for Analytics

```sql
-- Daily active users
SELECT DATE(created_at) as date, COUNT(DISTINCT created_by) as dau
FROM prayer_sessions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Average attendees per session
SELECT AVG(attendee_count) as avg_attendees
FROM (
  SELECT session_id, COUNT(*) as attendee_count
  FROM session_attendees
  GROUP BY session_id
) subquery;

-- Most active users (leaderboard)
SELECT u.display_name, COUNT(ps.id) as sessions_created
FROM users u
JOIN prayer_sessions ps ON u.id = ps.created_by
WHERE ps.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.display_name
ORDER BY sessions_created DESC
LIMIT 10;

-- Most popular prayer times
SELECT prayer_type, COUNT(*) as session_count
FROM prayer_sessions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY prayer_type
ORDER BY session_count DESC;

-- Most popular locations
SELECT ps.name, COUNT(*) as session_count
FROM prayer_sessions psess
JOIN prayer_spaces ps ON psess.prayer_space_id = ps.id
WHERE psess.created_at >= NOW() - INTERVAL '7 days'
GROUP BY ps.id, ps.name
ORDER BY session_count DESC
LIMIT 10;
```

### 21.3 Error Tracking (Sentry)

Configure Sentry to catch:
- JavaScript errors (unhandled exceptions)
- Network errors (API failures)
- React errors (via Error Boundary)
- Native crashes (iOS/Android)

**Alert rules**:
- Critical: >10 crashes/hour → Email + Slack notification
- High: >5 errors of same type in 1 hour → Email
- Medium: New error type → Slack notification

---

## 22. Cost Estimation

### 22.1 Monthly Operating Costs (MVP)

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| Supabase | Free | $0 | 500MB database, 50k MAU, 2GB bandwidth |
| Expo | Free | $0 | Unlimited builds, push notifications |
| Google Maps API | Free tier | $0 | $200/month credit (enough for 40k API calls) |
| Aladhan API | Free | $0 | No rate limits for reasonable usage |
| Domain (jamaat-app.com) | Namecheap | $12/year | ~$1/month |
| **Total** | | **~$1/month** | |

### 22.2 Scaling Costs (1,000+ MAU)

| Service | Tier | Cost | Notes |
|---------|------|------|-------|
| Supabase | Pro | $25/month | 8GB database, unlimited MAU, 100GB bandwidth |
| Expo | Free | $0 | Still within free tier |
| Google Maps API | Pay-as-you-go | ~$50/month | Assuming 200k API calls (20 per user/month) |
| Sentry | Developer | $29/month | 50k errors, 1 project, 1 user |
| **Total** | | **~$104/month** | |

### 22.3 Revenue Opportunities (Future)

Not required for MVP, but potential monetization paths:
1. **Freemium Model**: Premium features (unlimited sessions, advanced analytics)
2. **Partnerships**: Sponsored masjids (promoted prayer times)
3. **Donations**: "Support Jamaat" button (Stripe integration)
4. **University Partnerships**: White-label version for MSAs

---

## End of PRD

**Document Version**: 1.0  
**Last Updated**: January 29, 2026  
**Author**: Product Team  
**Status**: Ready for Development

---

**Next Steps**:
1. Review PRD with engineering team
2. Set up project repository and development environment
3. Begin Phase 1 implementation (Foundation)
4. Schedule weekly sprint planning meetings
5. Create GitHub project board for task tracking

For questions or clarifications, contact the product team or refer to the [Appendix](#17-appendix) for additional resources.
