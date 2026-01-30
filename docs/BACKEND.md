# Backend Documentation

**Last Updated**: January 29, 2026  
**Version**: 1.0

## Overview

This document outlines the backend architecture, infrastructure, and server-side logic for Jamaat. The backend is built primarily on **Supabase** (PostgreSQL + Auth + Realtime) with supplementary external APIs.

---

## 1. Architecture Overview

### 1.1 Tech Stack

```
┌─────────────────────────────────────────────┐
│           Mobile App (React Native)         │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐ │
│  │  Supabase   │  │  External APIs       │ │
│  │  Client SDK │  │  - Aladhan           │ │
│  └─────────────┘  │  - Google Maps       │ │
│                   │  - Expo Notifications│ │
│                   └──────────────────────┘ │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│              Supabase Backend               │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  PostgreSQL Database (PostGIS)       │  │
│  │  - Users, Sessions, Spaces           │  │
│  │  - Row Level Security (RLS)          │  │
│  │  - Database Functions                │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Authentication Service              │  │
│  │  - JWT tokens                        │  │
│  │  - Magic links, OTP                  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Realtime Service                    │  │
│  │  - WebSocket connections             │  │
│  │  - Live session updates              │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Edge Functions (Deno)               │  │
│  │  - Notifications                     │  │
│  │  - Scheduled jobs                    │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 1.2 Core Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | PostgreSQL 15 + PostGIS | Data persistence, geospatial queries |
| **Authentication** | Supabase Auth | User management, JWT tokens |
| **Real-time** | Supabase Realtime | Live updates via WebSocket |
| **Functions** | Supabase Edge Functions (Deno) | Serverless logic, cron jobs |
| **Storage** | Supabase Storage | File uploads (future: profile pics) |
| **API Gateway** | Supabase REST API | Auto-generated REST endpoints |

---

## 2. Database Architecture

### 2.1 Entity Relationship Diagram

```
┌─────────────┐
│   users     │
│─────────────│
│ id (PK)     │
│ email       │
│ phone       │
│ display_name│
│ university_id (FK)
│ ...         │
└──────┬──────┘
       │
       │ creates ↓
       │
┌──────┴──────────────┐         ┌─────────────────┐
│  prayer_sessions    │─────────│ session_attendees│
│─────────────────────│ 1:N     │─────────────────│
│ id (PK)             │         │ id (PK)         │
│ prayer_space_id (FK)│         │ session_id (FK) │
│ custom_location     │         │ user_id (FK)    │
│ prayer_type         │         │ joined_at       │
│ scheduled_time      │         └─────────────────┘
│ created_by (FK)     │
│ ...                 │
└──────┬──────────────┘
       │
       │ located at ↓
       │
┌──────┴────────────┐          ┌──────────────┐
│  prayer_spaces    │──────────│ universities │
│───────────────────│  N:1     │──────────────│
│ id (PK)           │          │ id (PK)      │
│ name              │          │ name         │
│ location (POINT)  │          │ location     │
│ university_id (FK)│          │ email_domain │
│ space_type        │          │ ...          │
│ is_verified       │          └──────────────┘
│ ...               │
└───────────────────┘
```

### 2.2 Table Schemas

See `PRD.md` Section 3.1 for full schema definitions. Key tables:

- **users**: User profiles and preferences
- **universities**: Campus definitions
- **prayer_spaces**: Physical locations for prayers
- **prayer_sessions**: Scheduled prayer events
- **session_attendees**: Many-to-many relationship (users ↔ sessions)

### 2.3 Indexes Strategy

All indexes are defined in the schema. Critical indexes:

```sql
-- Geospatial queries (within radius)
CREATE INDEX idx_prayer_spaces_location ON prayer_spaces USING GIST(location);
CREATE INDEX idx_prayer_sessions_location ON prayer_sessions USING GIST(custom_location);

-- Time-based queries (upcoming sessions)
CREATE INDEX idx_prayer_sessions_time ON prayer_sessions(scheduled_time) WHERE is_active = true;

-- Join queries (attendees)
CREATE INDEX idx_session_attendees_session ON session_attendees(session_id);
CREATE INDEX idx_session_attendees_user ON session_attendees(user_id);

-- User queries
CREATE INDEX idx_users_university ON users(university_id);
CREATE INDEX idx_prayer_spaces_university ON prayer_spaces(university_id);
```

---

## 3. Supabase Client Setup

### 3.1 Client Configuration

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from '../types/database';

// Secure storage adapter for tokens
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 3.2 Type Generation

```bash
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id your-project-id > types/database.ts
```

```typescript
// types/database.ts (auto-generated)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string;
          // ... other fields
        };
        Insert: {
          id?: string;
          email?: string | null;
          display_name: string;
          // ...
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string;
          // ...
        };
      };
      // ... other tables
    };
  };
};
```

---

## 4. API Operations

### 4.1 Query Patterns

#### Fetch Sessions (with filters)

```typescript
// lib/api/sessions.ts
export const fetchSessions = async (params: {
  latitude: number;
  longitude: number;
  radius?: number; // meters
  universityId?: string;
  fromTime?: Date;
  limit?: number;
}) => {
  const { latitude, longitude, radius = 3218, fromTime = new Date(), limit = 50 } = params;

  // Call database function for geospatial query
  const { data, error } = await supabase.rpc('get_sessions_within_radius', {
    user_lat: latitude,
    user_lng: longitude,
    radius_meters: radius,
    from_time: fromTime.toISOString(),
    limit_count: limit,
  });

  if (error) throw error;
  return data;
};

// Alternative: Query with PostGIS directly
export const fetchSessionsManual = async (params: {
  latitude: number;
  longitude: number;
  radius?: number;
}) => {
  const { data, error } = await supabase
    .from('prayer_sessions')
    .select(`
      *,
      prayer_spaces (id, name, location),
      session_attendees (count)
    `)
    .eq('is_active', true)
    .gte('scheduled_time', new Date().toISOString())
    .order('scheduled_time', { ascending: true })
    .limit(50);

  if (error) throw error;

  // Filter by distance client-side (or use ST_DWithin in RPC)
  return data.filter(session => {
    // Calculate distance and filter
  });
};
```

#### Create Session

```typescript
// lib/api/sessions.ts
export const createSession = async (input: {
  prayerType: PrayerType;
  prayerSpaceId?: string;
  customLocation?: { latitude: number; longitude: number };
  customLocationName?: string;
  scheduledTime: Date;
  notes?: string;
  createdBy: string;
}) => {
  const { data, error } = await supabase
    .from('prayer_sessions')
    .insert({
      prayer_type: input.prayerType,
      prayer_space_id: input.prayerSpaceId,
      custom_location: input.customLocation
        ? `POINT(${input.customLocation.longitude} ${input.customLocation.latitude})`
        : null,
      custom_location_name: input.customLocationName,
      scheduled_time: input.scheduledTime.toISOString(),
      notes: input.notes,
      created_by: input.createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

#### Join/Leave Session

```typescript
// lib/api/attendees.ts
export const joinSession = async (sessionId: string, userId: string) => {
  const { data, error } = await supabase
    .from('session_attendees')
    .insert({
      session_id: sessionId,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (already joined)
    if (error.code === '23505') {
      throw new Error('You have already joined this prayer');
    }
    throw error;
  }

  return data;
};

export const leaveSession = async (sessionId: string, userId: string) => {
  const { error } = await supabase
    .from('session_attendees')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId);

  if (error) throw error;
};
```

### 4.2 Real-time Subscriptions

```typescript
// lib/api/realtime.ts
export const subscribeToSessions = (
  onInsert: (session: PrayerSession) => void,
  onUpdate: (session: PrayerSession) => void,
  onDelete: (sessionId: string) => void
) => {
  const channel = supabase
    .channel('prayer_sessions_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'prayer_sessions',
      },
      (payload) => onInsert(payload.new as PrayerSession)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'prayer_sessions',
      },
      (payload) => onUpdate(payload.new as PrayerSession)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'prayer_sessions',
      },
      (payload) => onDelete(payload.old.id)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Usage in component
useEffect(() => {
  const unsubscribe = subscribeToSessions(
    (newSession) => {
      // Add to feed if within radius
      if (isWithinUserRadius(newSession)) {
        setSessions(prev => [newSession, ...prev]);
      }
    },
    (updatedSession) => {
      setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    },
    (deletedId) => {
      setSessions(prev => prev.filter(s => s.id !== deletedId));
    }
  );

  return unsubscribe;
}, []);
```

---

## 5. Authentication Flow

### 5.1 Sign-Up (Email Magic Link)

```typescript
// lib/api/auth.ts
export const signUpWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'jamaat://auth/callback',
    },
  });

  if (error) throw error;
  return data;
};

// User clicks magic link → Redirects to app → Auto-authenticated
```

### 5.2 Sign-Up (Phone OTP)

```typescript
export const signUpWithPhone = async (phone: string) => {
  // Format: +1234567890 (E.164)
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
  });

  if (error) throw error;
  return data;
};

export const verifyOtp = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });

  if (error) throw error;
  return data;
};
```

### 5.3 Session Management

```typescript
// Get current session
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

// Get current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Navigate to main app
  } else if (event === 'SIGNED_OUT') {
    // Navigate to login
  } else if (event === 'TOKEN_REFRESHED') {
    // Update session in state
  }
});
```

### 5.4 Profile Creation (Post-Auth)

```typescript
export const createUserProfile = async (userId: string, input: {
  displayName: string;
  isStudent?: boolean;
  universityId?: string;
}) => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      display_name: input.displayName,
      is_student: input.isStudent || false,
      university_id: input.universityId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
```

---

## 6. Edge Functions (Serverless)

### 6.1 Send Notification Function

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { sessionId, type } = await req.json();

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch session details
    const { data: session } = await supabase
      .from('prayer_sessions')
      .select('*, prayer_spaces(name)')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    // Fetch users to notify (within radius)
    const { data: users } = await supabase.rpc('get_users_within_radius', {
      session_id: sessionId,
      radius_meters: 3218, // 2 miles
    });

    // Send push notifications
    const messages = users.map((user) => ({
      to: user.expo_push_token,
      sound: 'default',
      title: 'New prayer session near you',
      body: `${session.prayer_type} at ${session.scheduled_time} in ${session.prayer_spaces?.name || 'your area'}`,
      data: { sessionId, type: 'new_prayer' },
    }));

    // Batch send via Expo API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response(JSON.stringify({ sent: messages.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
```

### 6.2 Deactivate Past Sessions (Cron)

```typescript
// supabase/functions/deactivate-sessions/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Deactivate sessions older than 30 minutes
  const { data, error } = await supabase.rpc('deactivate_past_sessions');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// Trigger: Schedule via Supabase Dashboard (or pg_cron)
// Cron: */30 * * * * (every 30 minutes)
```

### 6.3 Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-id

# Deploy function
supabase functions deploy send-notification

# Set secrets
supabase secrets set EXPO_ACCESS_TOKEN=your-expo-token
```

---

## 7. External API Integrations

### 7.1 Aladhan Prayer Times API

```typescript
// lib/api/prayer-times.ts
const ALADHAN_BASE_URL = 'https://api.aladhan.com/v1';

export const fetchPrayerTimes = async (
  latitude: number,
  longitude: number,
  date: Date = new Date()
) => {
  const timestamp = Math.floor(date.getTime() / 1000);

  const response = await fetch(
    `${ALADHAN_BASE_URL}/timings/${timestamp}?` +
    `latitude=${latitude}&longitude=${longitude}&method=2`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch prayer times');
  }

  const json = await response.json();

  return {
    fajr: json.data.timings.Fajr,
    dhuhr: json.data.timings.Dhuhr,
    asr: json.data.timings.Asr,
    maghrib: json.data.timings.Maghrib,
    isha: json.data.timings.Isha,
    date: json.data.date.gregorian.date,
  };
};

// Cache prayer times
export const getCachedPrayerTimes = async (latitude: number, longitude: number) => {
  const cacheKey = `prayer_times_${latitude}_${longitude}_${new Date().toDateString()}`;
  
  // Check AsyncStorage
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch fresh data
  const times = await fetchPrayerTimes(latitude, longitude);
  
  // Cache for 24 hours
  await AsyncStorage.setItem(cacheKey, JSON.stringify(times));
  
  return times;
};
```

### 7.2 Google Maps APIs

#### Places Autocomplete

```typescript
// lib/api/google-maps.ts
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export const searchPlaces = async (query: string, location?: { lat: number; lng: number }) => {
  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_MAPS_API_KEY!,
    types: 'establishment',
  });

  if (location) {
    params.append('location', `${location.lat},${location.lng}`);
    params.append('radius', '5000'); // 5km bias
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
  );

  const json = await response.json();
  return json.predictions;
};
```

#### Geocoding

```typescript
export const geocodeAddress = async (address: string) => {
  const params = new URLSearchParams({
    address,
    key: GOOGLE_MAPS_API_KEY!,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params}`
  );

  const json = await response.json();
  if (json.results.length === 0) {
    throw new Error('Address not found');
  }

  const { lat, lng } = json.results[0].geometry.location;
  return { latitude: lat, longitude: lng };
};
```

### 7.3 Expo Push Notifications

```typescript
// lib/api/notifications.ts
export const registerForPushNotifications = async () => {
  // Request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Permission not granted');
  }

  // Get Expo push token
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Save to database
  const { error } = await supabase
    .from('users')
    .update({ expo_push_token: token })
    .eq('id', userId);

  if (error) throw error;

  return token;
};
```

---

## 8. Database Functions

### 8.1 Geospatial Query (Sessions Within Radius)

Already defined in PRD Section 3.2. Key points:

- Uses PostGIS `ST_DWithin` for efficient distance filtering
- Returns sessions with distance, attendee count, space details
- Accepts parameters: lat, lng, radius (meters), from_time, limit

### 8.2 Trigger: Rate Limiting

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

### 8.3 Trigger: Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prayer_sessions_updated_at
  BEFORE UPDATE ON prayer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 9. Error Handling

### 9.1 Error Types

```typescript
// lib/errors.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthError extends ApiError {
  constructor(message: string) {
    super('AUTH_ERROR', message, 401);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class RateLimitError extends ApiError {
  constructor() {
    super('RATE_LIMIT', 'Too many requests. Try again later.', 429);
  }
}
```

### 9.2 Error Handler Wrapper

```typescript
// lib/api/utils.ts
export const withErrorHandler = <T extends (...args: any[]) => any>(
  fn: T
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error: any) {
      // Supabase errors
      if (error.code === '23505') {
        throw new ValidationError('Resource already exists');
      } else if (error.code === '23503') {
        throw new ValidationError('Referenced resource not found');
      } else if (error.code === 'PGRST116') {
        throw new NotFoundError('Resource');
      }

      // Network errors
      if (error.message === 'Failed to fetch') {
        throw new ApiError('NETWORK_ERROR', 'Network request failed', 0);
      }

      // Re-throw if already an ApiError
      if (error instanceof ApiError) {
        throw error;
      }

      // Generic error
      throw new ApiError('UNKNOWN_ERROR', error.message || 'An error occurred', 500);
    }
  };
};

// Usage
export const fetchSessions = withErrorHandler(async (params) => {
  // ... query logic
});
```

---

## 10. Caching Strategy

### 10.1 Client-Side Caching

```typescript
// lib/cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'jamaat_cache_';

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const item = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;

    const { value, expiry } = JSON.parse(item);
    if (expiry && Date.now() > expiry) {
      await this.remove(key);
      return null;
    }

    return value;
  },

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const item = {
      value,
      expiry: ttl ? Date.now() + ttl : null,
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  },

  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  },
};

// Usage
const TTL_24_HOURS = 24 * 60 * 60 * 1000;

// Cache prayer times
await cache.set('prayer_times', prayerTimes, TTL_24_HOURS);

// Retrieve
const cachedTimes = await cache.get<PrayerTimes>('prayer_times');
```

### 10.2 React Query Integration (Future)

```typescript
// lib/hooks/useSessions.ts
import { useQuery } from '@tanstack/react-query';

export const useSessions = (params: SessionParams) => {
  return useQuery({
    queryKey: ['sessions', params],
    queryFn: () => fetchSessions(params),
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
};
```

---

## 11. Performance Optimization

### 11.1 Database Optimization

- **Indexes**: All critical columns indexed (see Section 2.3)
- **Pagination**: Use `limit` + `offset` for feed (20 items at a time)
- **Realtime filters**: Subscribe only to relevant changes
- **Materialized views**: (Future) Pre-compute aggregates

### 11.2 Query Optimization

```typescript
// BAD: N+1 query (fetches attendees separately for each session)
const sessions = await supabase.from('prayer_sessions').select('*');
for (const session of sessions) {
  const attendees = await supabase
    .from('session_attendees')
    .select('*')
    .eq('session_id', session.id);
  session.attendees = attendees;
}

// GOOD: Single query with join
const sessions = await supabase
  .from('prayer_sessions')
  .select(`
    *,
    session_attendees(
      id,
      user_id,
      users(display_name)
    )
  `);
```

### 11.3 Connection Pooling

Supabase handles connection pooling automatically via PgBouncer. No configuration needed for MVP.

---

## 12. Monitoring & Logging

### 12.1 Supabase Dashboard

Monitor via Supabase dashboard:

- **Database**: Query performance, table sizes, index usage
- **Auth**: Sign-ups, active users, failed login attempts
- **Realtime**: Active connections, messages sent/received
- **Storage**: Usage, bandwidth
- **Edge Functions**: Invocations, errors, latency

### 12.2 Custom Logging

```typescript
// lib/logger.ts
import * as Sentry from 'sentry-expo';

export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data);
  },

  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${message}`, data);
    Sentry.Native.captureMessage(message, {
      level: 'warning',
      extra: data,
    });
  },

  error: (message: string, error: Error, data?: any) => {
    console.error(`[ERROR] ${message}`, error, data);
    Sentry.Native.captureException(error, {
      extra: { message, ...data },
    });
  },
};

// Usage
try {
  await createSession(input);
} catch (error) {
  logger.error('Failed to create session', error, { input });
  throw error;
}
```

---

## 13. Backup & Disaster Recovery

### 13.1 Automated Backups

Supabase provides:

- **Daily backups**: Automatic (free tier: 7-day retention)
- **Point-in-time recovery**: Pro plan (restore to any timestamp)

### 13.2 Manual Backup

```bash
# Export database via pg_dump
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql

# Import
psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## 14. Scaling Considerations

### 14.1 Current Limits (Free Tier)

- **Database**: 500 MB storage
- **API requests**: 50k/month
- **Bandwidth**: 2 GB egress/month
- **Realtime**: 200 concurrent connections
- **Edge Functions**: 500k invocations/month

### 14.2 Scaling Strategy

When limits are reached:

1. **Upgrade to Pro**: $25/month (8 GB database, unlimited API)
2. **Optimize queries**: Reduce unnecessary API calls
3. **Add caching**: Cache frequently accessed data (prayer times, universities)
4. **Read replicas**: (Pro plan) Distribute read load

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 29, 2026 | Initial backend architecture |

---

**Next Review**: After MVP launch (estimate: March 2026)
