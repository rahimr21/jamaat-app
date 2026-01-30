# Security Documentation

**Last Updated**: January 29, 2026  
**Version**: 1.0

## Overview

This document outlines all security measures, best practices, and implementation guidelines for Jamaat. Security is a top priority and should be considered at every layer of the application.

---

## 1. Security Layers

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  - Input validation (Zod)               │
│  - XSS prevention                       │
│  - Client-side rate limiting            │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Network Layer                   │
│  - HTTPS/TLS encryption                 │
│  - API key restrictions                 │
│  - Request signing                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Database Layer                  │
│  - Row Level Security (RLS)             │
│  - Parameterized queries                │
│  - Database rate limiting (triggers)    │
│  - Encrypted at rest                    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Authentication Layer            │
│  - JWT tokens                           │
│  - Secure token storage                 │
│  - Session management                   │
└─────────────────────────────────────────┘
```

---

## 2. Input Validation

### 2.1 Client-Side Validation (Zod)

**Always validate user input before sending to backend**:

```typescript
// lib/validation/schemas.ts
import { z } from 'zod';

// User profile validation
export const userProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{10,14}$/, 'Invalid phone number (E.164 format)')
    .optional(),
});

// Prayer session validation
export const createSessionSchema = z.object({
  prayerType: z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jummah'], {
    errorMap: () => ({ message: 'Invalid prayer type' }),
  }),
  prayerSpaceId: z.string().uuid('Invalid space ID').optional(),
  customLocation: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  customLocationName: z
    .string()
    .max(100, 'Location name too long')
    .optional(),
  scheduledTime: z.date().refine(
    (date) => date > new Date(),
    'Cannot schedule prayer in the past'
  ),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
}).refine(
  (data) => !!(data.prayerSpaceId || data.customLocation),
  {
    message: 'Must provide either prayer space or custom location',
    path: ['prayerSpaceId'],
  }
);

// Prayer space submission validation
export const createSpaceSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description too long')
    .optional(),
  universityId: z.string().uuid('Invalid university ID'),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});
```

**Usage in components**:

```typescript
// CreateSessionScreen.tsx
const handleSubmit = async () => {
  try {
    // Validate input
    const validatedData = createSessionSchema.parse({
      prayerType,
      prayerSpaceId,
      customLocation,
      scheduledTime,
      notes,
    });

    // Submit to backend
    await createSession(validatedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Show validation errors
      setErrors(error.flatten().fieldErrors);
    }
  }
};
```

### 2.2 Sanitization

**HTML/XSS Prevention**:

```typescript
// lib/utils/sanitize.ts
import DOMPurify from 'dompurify';

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  });
};

export const sanitizeUserInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 500); // Limit length
};

// Usage
const sanitizedNotes = sanitizeUserInput(userNotes);
```

**SQL Injection Prevention**:
- ✅ Supabase client automatically parameterizes queries
- ✅ Never use string concatenation for queries
- ✅ Use RPC functions for complex queries

```typescript
// ✅ SAFE: Parameterized
const { data } = await supabase
  .from('prayer_sessions')
  .select('*')
  .eq('created_by', userId); // Automatically escaped

// ❌ UNSAFE: String concatenation
const { data } = await supabase.rpc('raw_query', {
  query: `SELECT * FROM prayer_sessions WHERE created_by = '${userId}'` // NEVER DO THIS!
});
```

### 2.3 File Upload Validation (Future)

When adding profile pictures:

```typescript
const validateImageUpload = (file: File): boolean => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File too large (max 5MB)');
  }

  return true;
};
```

---

## 3. Rate Limiting

### 3.1 Database-Level Rate Limiting

**Session Creation Limit** (via trigger):

```sql
-- Already defined in DATABASE_AUTH.md
-- Limit: 10 sessions per user per day
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
```

**Prayer Space Submission Limit**:

```sql
CREATE OR REPLACE FUNCTION check_space_creation_limit()
RETURNS TRIGGER AS $$
DECLARE
  space_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO space_count
  FROM prayer_spaces
  WHERE created_by = NEW.created_by
    AND created_at >= NOW() - INTERVAL '1 hour';
  
  -- Limit: 3 spaces per hour
  IF space_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 3 space submissions per hour';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_space_rate_limit
  BEFORE INSERT ON prayer_spaces
  FOR EACH ROW
  EXECUTE FUNCTION check_space_creation_limit();
```

### 3.2 Client-Side Rate Limiting

**Debounce Search Queries**:

```typescript
// lib/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Usage in search
const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      searchLocations(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <Input value={query} onChangeText={setQuery} />;
};
```

**Throttle Location Updates**:

```typescript
// lib/hooks/useThrottle.ts
import { useRef, useCallback } from 'react';

export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) => {
  const lastRun = useRef(Date.now());

  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
};

// Usage
const updateLocation = useThrottle(async (coords) => {
  await saveLocation(coords);
}, 60000); // Max once per minute
```

### 3.3 API Rate Limits

**Supabase Rate Limits** (free tier):
- REST API: 100 requests per 10 seconds per IP
- Realtime: 200 concurrent connections
- Edge Functions: 500k invocations per month

**Google Maps API Limits**:
- Places Autocomplete: 100k requests/day (free)
- Geocoding: 40k requests/day (free)

**Aladhan API Limits**:
- 100 requests per minute (no API key needed)
- Cache responses for 24 hours

**Implement Caching**:

```typescript
// lib/cache/api-cache.ts
const cache = new Map<string, { data: any; expiry: number }>();

export const cachedFetch = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600000 // 1 hour default
): Promise<T> => {
  const cached = cache.get(key);
  
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, expiry: Date.now() + ttl });
  
  return data;
};

// Usage
const prayerTimes = await cachedFetch(
  `prayer_times_${lat}_${lng}_${date}`,
  () => fetchPrayerTimes(lat, lng),
  86400000 // 24 hours
);
```

---

## 4. API Key Management

### 4.1 Environment Variables

**Never commit API keys to git**:

```bash
# .env (add to .gitignore)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... # Safe to expose (RLS protected)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...     # NEVER expose in client

EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID=AIzaSy...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS=AIzaSy...

EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

**Load in app**:

```typescript
// app.config.ts
export default {
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    googleMapsApiKey: Platform.select({
      ios: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS,
      android: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID,
    }),
  },
};

// Access in app
import Constants from 'expo-constants';
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
```

### 4.2 API Key Restrictions

**Google Maps API Keys** (via GCP Console):

1. **Android Key**:
   - Restrict to: Android apps
   - Add SHA-1 fingerprint: `keytool -list -v -keystore ~/.android/debug.keystore`
   - APIs enabled: Maps SDK, Places API, Geocoding API

2. **iOS Key**:
   - Restrict to: iOS apps
   - Add bundle identifier: `com.yourcompany.jamaat`
   - APIs enabled: Maps SDK, Places API, Geocoding API

**Supabase Anon Key**:
- Safe to expose (protected by RLS)
- Can only access data allowed by RLS policies
- No admin operations possible

**Supabase Service Role Key**:
- ⚠️ **NEVER** include in client code
- Only use in Edge Functions (server-side)
- Bypasses RLS (full database access)

### 4.3 Key Rotation

**When to rotate keys**:
- Key compromised (leaked in git, etc.)
- Every 90 days (best practice)
- After employee departure (if they had access)

**How to rotate**:

1. **Google Maps**:
   - Create new key in GCP Console
   - Update `.env` file
   - Rebuild app
   - Delete old key after rollout

2. **Supabase**:
   - Generate new anon key in dashboard
   - Update `.env` file
   - Deploy new app version
   - Old key remains valid (no action needed)

---

## 5. Authentication Security

### 5.1 JWT Token Security

**Token Storage**:
```typescript
// ✅ SECURE: Use SecureStore (encrypted)
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('supabase_token', token);
const token = await SecureStore.getItemAsync('supabase_token');

// ❌ INSECURE: AsyncStorage (not encrypted)
await AsyncStorage.setItem('supabase_token', token); // Don't do this!
```

**Token Validation**:
```typescript
// Server-side (Edge Function)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Verify JWT
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error) {
  return new Response('Unauthorized', { status: 401 });
}
```

**Token Refresh**:
```typescript
// Automatically handled by Supabase client
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed automatically');
  }
});

// Manual refresh (if needed)
const { data, error } = await supabase.auth.refreshSession();
```

### 5.2 Password Security (if implementing password auth)

**Password Requirements**:
```typescript
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');
```

**Hashing** (handled by Supabase Auth):
- Algorithm: bcrypt
- Work factor: 10 (2^10 iterations)
- Never store plaintext passwords

### 5.3 OTP Security

**Rate Limiting**:
```typescript
// Limit OTP requests per phone number
const otpCache = new Map<string, { count: number; resetTime: number }>();

const checkOtpRateLimit = (phone: string): boolean => {
  const now = Date.now();
  const record = otpCache.get(phone);

  if (!record || now > record.resetTime) {
    // Reset after 1 hour
    otpCache.set(phone, { count: 1, resetTime: now + 3600000 });
    return true;
  }

  if (record.count >= 5) {
    throw new Error('Too many OTP requests. Try again in 1 hour.');
  }

  record.count++;
  return true;
};
```

**OTP Expiry**:
- Supabase OTPs expire after 60 seconds
- Must be verified within 1 hour of request
- After 3 failed attempts, require new OTP

### 5.4 Session Hijacking Prevention

**HTTPS Only**:
- All API requests must use HTTPS (TLS 1.2+)
- Expo enforces this by default

**Session Timeout**:
- JWT expires after 1 hour
- Refresh token expires after 7 days
- Force re-login after 30 days of inactivity

**Device Fingerprinting** (future):
```typescript
import * as Device from 'expo-device';
import * as Application from 'expo-application';

const deviceFingerprint = {
  deviceId: Application.androidId || Device.modelId,
  deviceName: Device.modelName,
  osVersion: Device.osVersion,
};

// Store fingerprint with session
// Alert user if login from new device
```

---

## 6. Data Protection

### 6.1 Encryption at Rest

**Database**: Supabase encrypts all data at rest using AES-256

**Backups**: Encrypted with same key

**SecureStore**: Expo SecureStore uses platform keychain (iOS Keychain, Android Keystore)

### 6.2 Encryption in Transit

**TLS/HTTPS**:
- All API requests use HTTPS (TLS 1.3 preferred, 1.2 minimum)
- Certificate pinning (future enhancement):

```typescript
// expo-constants or custom native module
const pinnedCertificates = {
  'api.supabase.co': 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
};
```

### 6.3 Data Minimization

**Only collect necessary data**:
- ✅ Display name, email/phone (for auth)
- ✅ University (for campus features)
- ✅ Location (only during session creation, not continuously tracked)
- ❌ Date of birth, address, SSN, etc. (not needed)

**Location Privacy**:
```typescript
// Only request location when needed
const requestLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  // Get location once (not continuous tracking)
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced, // Not highest (privacy)
  });

  return location.coords;
};
```

### 6.4 Data Deletion

**User Right to Deletion** (GDPR/CCPA):

```typescript
// lib/api/user.ts
export const deleteUserAccount = async (userId: string) => {
  // 1. Delete user profile (CASCADE deletes sessions, attendees)
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (deleteError) throw deleteError;

  // 2. Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) throw authError;

  // 3. Sign out
  await supabase.auth.signOut();
};
```

**Anonymization** (instead of deletion, for data integrity):

```sql
-- Replace with anonymous user
UPDATE users SET
  display_name = 'Deleted User',
  email = NULL,
  phone = NULL,
  expo_push_token = NULL
WHERE id = 'user-id';
```

---

## 7. Row Level Security (RLS) Deep Dive

### 7.1 RLS Testing

**Test as different users**:

```typescript
// Test as user A
const userAClient = createClient(supabaseUrl, supabaseAnonKey);
await userAClient.auth.signInWithPassword({
  email: 'userA@example.com',
  password: 'password',
});

const { data: sessions } = await userAClient
  .from('prayer_sessions')
  .select('*');

console.log('User A sees:', sessions.length, 'sessions');

// Test as user B
const userBClient = createClient(supabaseUrl, supabaseAnonKey);
await userBClient.auth.signInWithPassword({
  email: 'userB@example.com',
  password: 'password',
});

// Try to delete user A's session
const { error } = await userBClient
  .from('prayer_sessions')
  .delete()
  .eq('id', userASessionId);

console.log('User B delete error:', error); // Should fail
```

### 7.2 RLS Policy Patterns

**Owner-only access**:
```sql
CREATE POLICY "Users can only access their own data"
  ON table_name
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
```

**Public read, owner write**:
```sql
CREATE POLICY "Anyone can read, only owner can write"
  ON table_name
  FOR SELECT USING (true);

CREATE POLICY "Owner can update"
  ON table_name
  FOR UPDATE
  USING (created_by = auth.uid());
```

**Conditional access**:
```sql
CREATE POLICY "View if active or owner"
  ON prayer_sessions
  FOR SELECT
  USING (
    is_active = true OR
    created_by = auth.uid()
  );
```

### 7.3 RLS Performance

**Optimize policies with indexes**:
```sql
-- If policy checks created_by frequently
CREATE INDEX idx_prayer_sessions_creator ON prayer_sessions(created_by);

-- If policy checks is_active frequently
CREATE INDEX idx_prayer_sessions_active ON prayer_sessions(is_active) WHERE is_active = true;
```

**Avoid complex policies**:
```sql
-- ❌ BAD: Subquery in policy (slow)
CREATE POLICY "Complex policy"
  ON table_name
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM other_table
      WHERE other_table.user_id = auth.uid()
      AND other_table.related_id = table_name.id
    )
  );

-- ✅ GOOD: Use JOIN in query instead
SELECT * FROM table_name
JOIN other_table ON ...
WHERE ...
```

---

## 8. Security Monitoring

### 8.1 Error Tracking (Sentry)

```typescript
import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'https://xxxxx@sentry.io/xxxxx',
  enableInExpoDevelopment: false,
  debug: __DEV__,
});

// Capture security-related errors
try {
  await createSession(data);
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    Sentry.captureException(error, {
      level: 'warning',
      tags: { type: 'rate_limit' },
      user: { id: userId },
    });
  }
}
```

### 8.2 Audit Logging

**Log critical actions**:

```sql
-- Create audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to log prayer session creation
CREATE OR REPLACE FUNCTION log_session_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    NEW.created_by,
    'session_created',
    'prayer_session',
    NEW.id,
    jsonb_build_object(
      'prayer_type', NEW.prayer_type,
      'scheduled_time', NEW.scheduled_time
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_session_creation
  AFTER INSERT ON prayer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_session_creation();
```

### 8.3 Suspicious Activity Detection

**Flag unusual patterns**:

```sql
-- Detect rapid session creation (possible spam)
CREATE OR REPLACE FUNCTION detect_spam_sessions()
RETURNS TABLE (user_id UUID, session_count BIGINT) AS $$
  SELECT 
    created_by as user_id,
    COUNT(*) as session_count
  FROM prayer_sessions
  WHERE created_at >= NOW() - INTERVAL '1 hour'
  GROUP BY created_by
  HAVING COUNT(*) >= 5;
$$ LANGUAGE sql;

-- Run hourly and alert admins
```

---

## 9. Incident Response

### 9.1 Data Breach Protocol

**If database compromised**:

1. **Immediate**:
   - Rotate all API keys
   - Reset all user passwords (force re-login)
   - Enable 2FA for admins
   - Review audit logs for unauthorized access

2. **Within 24 hours**:
   - Notify affected users via email
   - File breach report (if required by law)
   - Restore from backup (if data modified)

3. **Post-incident**:
   - Conduct security audit
   - Update security policies
   - Document lessons learned

### 9.2 API Key Leak

**If API key exposed in git**:

1. **Immediately revoke key** (GCP Console or Supabase Dashboard)
2. **Generate new key** and update `.env`
3. **Rebuild and deploy app** with new key
4. **Scan git history** and remove leaked key:

```bash
# Remove from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (careful!)
git push origin --force --all
```

5. **Rotate all other keys** (precaution)

### 9.3 DDoS Attack

**If experiencing high traffic**:

1. **Enable Supabase rate limiting** (dashboard settings)
2. **Block suspicious IPs** (via Cloudflare or firewall)
3. **Scale up infrastructure** (Supabase Pro tier)
4. **Implement CAPTCHA** for sensitive actions

---

## 10. Security Checklist

### 10.1 Pre-Launch Checklist

- [ ] All API keys in `.env` (not committed)
- [ ] RLS enabled on all tables
- [ ] RLS policies tested for all user roles
- [ ] Input validation on all forms (Zod)
- [ ] Rate limiting implemented (database triggers)
- [ ] HTTPS enforced for all requests
- [ ] JWT tokens stored in SecureStore
- [ ] Service role key NEVER in client code
- [ ] Google Maps API keys restricted (SHA-1/bundle ID)
- [ ] Error tracking configured (Sentry)
- [ ] Audit logging for critical actions
- [ ] Privacy policy written and accessible
- [ ] Terms of service written and accessible
- [ ] Data deletion process implemented

### 10.2 Post-Launch Monitoring

- [ ] Monitor error rates (Sentry dashboard)
- [ ] Review audit logs weekly
- [ ] Check for unusual API usage (Supabase dashboard)
- [ ] Update dependencies monthly (security patches)
- [ ] Rotate API keys every 90 days
- [ ] Conduct security audit quarterly
- [ ] Review RLS policies for new features
- [ ] Test disaster recovery plan

---

## 11. Compliance

### 11.1 GDPR (EU Users)

**Requirements**:
- ✅ Collect minimum necessary data
- ✅ Obtain explicit consent (ToS acceptance)
- ✅ Provide data export (JSON download)
- ✅ Provide data deletion (account deletion)
- ✅ Encrypt data in transit and at rest
- ✅ Report breaches within 72 hours

### 11.2 CCPA (California Users)

**Requirements**:
- ✅ Disclose data collection practices (privacy policy)
- ✅ Allow users to opt-out of data sale (we don't sell data)
- ✅ Provide data deletion upon request

### 11.3 COPPA (Children's Privacy)

**Not applicable**: App is 4+ but designed for adults. No data collection from children under 13.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 29, 2026 | Initial security documentation |

---

**Next Review**: After MVP launch (estimate: March 2026)

**Security Contact**: security@jamaat-app.com (to be created)
