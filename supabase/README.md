# Supabase Database Migrations

This directory contains the database migrations for the Jamaat app.

## Running Migrations

### Option 1: Supabase MCP (Cursor)

If you use the **Supabase MCP** in Cursor (configured in `~/.cursor/mcp.json` with your project):

1. Ensure the MCP is connected: **Cursor Settings → Tools & MCP** → Supabase shows as connected.
2. The MCP is exposed to the agent as **`user-supabase`** (not `supabase`).
3. Ask the AI: *"Run the Jamaat migration via the Supabase MCP"* (or use `apply_migration` with `name` + `query`).
4. `apply_migration` expects **`name`** (snake_case) and **`query`** (SQL). No `version` parameter.

**Note:** Enable PostGIS first (Database → Extensions → PostGIS) if you run migrations via MCP. The migration includes `CREATE EXTENSION IF NOT EXISTS "postgis"`, but enabling it in the Dashboard first avoids permission issues.

### Option 2: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/20260129000000_initial_schema.sql`
4. Paste and run the SQL

### Option 3: Supabase CLI

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_ID`
4. Push migrations: `supabase db push`

## Prerequisites

Before running migrations, ensure:

1. **PostGIS Extension**: Your Supabase project must have PostGIS enabled
   - Go to Database → Extensions → Search for "PostGIS" → Enable it

2. **pg_trgm Extension**: Required for full-text search on universities
   - This is enabled automatically in the migration

## Schema Overview

- **universities**: Campus definitions with geolocation
- **users**: User profiles (extends Supabase auth.users)
- **prayer_spaces**: Physical prayer locations
- **prayer_sessions**: Scheduled prayer events
- **session_attendees**: User attendance records

## Key Functions

- `get_sessions_within_radius()`: Fetch sessions near a location
- `get_user_sessions()`: Fetch user's created/joined sessions
- `deactivate_past_sessions()`: Cleanup old sessions (run via cron)

## Seed Data

The migration includes sample data:
- 3 universities (Boston College, MIT, Harvard)
- 3 verified prayer spaces

## Generating TypeScript Types

After running migrations, generate types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```
