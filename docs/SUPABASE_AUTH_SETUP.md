# Supabase Auth Setup

## Auth flow summary (current app behavior)

- **Email**: Primary path is **email + password** (sign in with `signInWithPassword`, sign up with `signUpWithEmail`). If "Confirm email" is **off** in Supabase, sign-up creates a session immediately and the user goes to the profile screen. If "Confirm email" is **on**, the user must click the link in the email; the app handles `jamaat://auth/callback` via deep linking and completes the session. Optional "Sign in with magic link" uses `signInWithOtp` and the same deep link.
- **Phone**: Phone number → `signInWithOtp` → Verify screen (6-digit OTP) → session → redirect to profile or tabs.
- **Redirect logic**: Handled inside the navigator in `(auth)/_layout.tsx` and `(tabs)/_layout.tsx` (no AuthGate at root). Profile screen **upserts** into `public.users`; an optional migration adds a trigger to create a row on `auth.users` insert.

## Verified project state

- **Project URL**: `https://thistxapupoittkxcthw.supabase.co`  
  Set `EXPO_PUBLIC_SUPABASE_URL` to this in `.env`.

- **Keys**: Use the **publishable** key or the **anon** (legacy) key in `.env` as `EXPO_PUBLIC_SUPABASE_ANON_KEY`.  
  Do **not** use the secret/service role key in the app.

- **Tables**: `public.users`, `universities`, `prayer_spaces`, `prayer_sessions`, `session_attendees` exist and RLS is enabled. Migration has been applied.

## Dashboard steps (required)

1. **Supabase Dashboard** → **Authentication** → **Providers**
   - **Email**: Enable. For **immediate** sign-up and sign-in without using the confirmation link, disable "Confirm email" so sign-up logs users in right away. If "Confirm email" is on, users must click the link in the email (and Redirect URLs must be set as in step 2).
   - **Phone**: Enable only if you use phone sign-in (requires Twilio/sms config in the project).

2. **Authentication** → **URL configuration** (required for email confirmation)
   - Under **Redirect URLs**, add:
     - `jamaat://**`
     - `jamaat://auth/callback`
   - Without these, the "Confirm your email" link in the signup email will send users to the **Site URL** (often `http://localhost:8081`), which does not work on a phone or in Expo Go. Adding the app scheme makes the link open your app after confirmation.
   - Optionally set **Site URL** to `jamaat://` if you want the default redirect to be the app; otherwise keep it for web and rely on the redirect URLs above.

After this, login and sign-up should work with the app, and new email confirmation links will open the app instead of localhost.

**Note:** Emails that were already sent before you added the redirect URLs still contain the old link (localhost). Request a new confirmation email from the app, or sign up again, to get a link that opens the app.
