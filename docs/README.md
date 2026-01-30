# Jamaat Documentation

This directory contains comprehensive documentation for the Jamaat mobile application. All documentation is written for AI agents (particularly Cursor with Supabase MCP) to maintain context and provide guidance during development.

---

## 📚 Documentation Files

### 1. **PRD.md** - Product Requirements Document
**Purpose**: Master specification document covering the entire project  
**Use when**: Starting new features, understanding overall architecture, making technical decisions

**Contains**:
- Project overview and goals
- Complete tech stack breakdown
- Database schema with PostGIS
- Authentication & authorization system
- API integrations (Aladhan, Google Maps, Expo Notifications)
- UI/UX specifications with wireframes
- User flows and screen layouts
- Security requirements (rate limiting, input validation, API keys)
- Testing strategy
- Deployment & release process
- Success metrics and KPIs
- 8-week implementation roadmap
- Cost estimation and scaling considerations

---

### 2. **APP_FLOW.md** - User Journey & Navigation
**Purpose**: Detailed documentation of all user flows and screen transitions  
**Use when**: Implementing navigation, designing UX, debugging user journeys, adding new screens

**Contains**:
- Complete onboarding flow (authentication → profile → main app)
- Main feed interactions (join/leave prayers, real-time updates)
- Create prayer session workflow
- Settings screen structure
- Notification flows and handling
- Real-time subscription patterns
- Error states and empty states
- Offline behavior
- Analytics event tracking

**Key Sections**:
- Navigation structure (auth, tabs, modals)
- Screen-by-screen breakdown with actions and validations
- State management patterns (Zustand, React Context)
- Deep linking setup

---

### 3. **FRONTEND_DESIGN.md** - UI/UX Design System
**Purpose**: Complete design system and component library reference  
**Use when**: Building UI components, styling screens, ensuring consistency, implementing animations

**Contains**:
- Design system (colors, typography, spacing, shadows)
- Component library specifications (Button, Card, Input, etc.)
- Prayer-specific components (SessionCard, PrayerTimesDisplay, LocationPicker)
- Screen layouts with exact dimensions
- Icon library (Lucide React Native)
- Animation patterns (button press, FAB rotation, modals)
- Accessibility guidelines (contrast, touch targets, screen readers)
- Responsive design breakpoints
- Loading states (skeleton screens, spinners)
- Error state patterns (inline, toasts, boundaries)
- NativeWind (Tailwind) configuration
- Dark mode setup (future)

**Key Sections**:
- Color palette with semantic meanings
- Typography scale and text styles
- Spacing system and presets
- Component specs with visual examples

---

### 4. **BACKEND.md** - Server Architecture & APIs
**Purpose**: Backend architecture, API design, and server-side logic  
**Use when**: Implementing API calls, database queries, real-time features, external integrations

**Contains**:
- Architecture overview (Supabase + external APIs)
- Database schema and relationships
- Supabase client setup with TypeScript types
- API operation patterns (queries, mutations, subscriptions)
- Real-time subscription implementation
- Authentication flows (email, phone OTP)
- Session management (JWT, refresh tokens)
- Edge Functions (Deno serverless)
  - Send notifications
  - Deactivate past sessions
- External API integrations
  - Aladhan (prayer times)
  - Google Maps (places, geocoding)
  - Expo Push Notifications
- Database functions (geospatial queries, aggregations)
- Error handling patterns
- Caching strategies
- Performance optimization
- Monitoring and logging

**Key Sections**:
- Complete API reference with examples
- Database function definitions
- Trigger implementations
- Real-time patterns and best practices

---

### 5. **DATABASE_AUTH.md** - Data Layer & Security
**Purpose**: Database schema, Row Level Security, and authentication system  
**Use when**: Creating migrations, setting up RLS policies, implementing auth, optimizing queries

**Contains**:
- Complete database schema (users, universities, prayer_spaces, prayer_sessions, session_attendees)
- Table definitions with constraints and indexes
- Database functions (geospatial queries, auto-deactivation)
- Triggers (timestamps, rate limiting, auto-attendees)
- Row Level Security (RLS) policies
  - User access policies
  - Session visibility rules
  - Attendee permissions
- Authentication system
  - Email + password (primary sign-in/sign-up)
  - Optional magic link; deep linking (jamaat://auth/callback)
  - Phone OTP flow
  - Session management; redirect logic in (auth)/(tabs) layouts
- Data access patterns (common queries, optimized joins, pagination)
- Migration system (Supabase migrations)
- Backup & recovery strategies
- Performance monitoring (query plans, index usage)

**Key Sections**:
- Full SQL schema with comments
- RLS policy patterns and examples
- Auth flow diagrams
- Query optimization techniques

---

### 6. **SUPABASE_AUTH_SETUP.md** - Supabase Auth Configuration
**Purpose**: Project-specific Supabase auth setup and redirect URLs  
**Use when**: Configuring the Supabase project, fixing "confirm email" links (localhost vs app), enabling email/phone providers

**Contains**:
- Auth flow summary (email+password primary, optional magic link, phone OTP)
- Verified project state (URL, keys, tables)
- Dashboard steps: Email/Phone providers, Redirect URLs (jamaat://**)
- Note on "Confirm email" off for immediate sign-up

---

### 7. **SECURITY.md** - Security Best Practices
**Purpose**: Comprehensive security guidelines and threat mitigation  
**Use when**: Implementing security features, reviewing code for vulnerabilities, handling sensitive data

**Contains**:
- Security layer architecture (app → network → database → auth)
- Input validation (Zod schemas for all forms)
- Sanitization (XSS prevention, SQL injection)
- Rate limiting
  - Database-level (triggers)
  - Client-side (debounce, throttle)
  - API-level (Supabase, Google Maps, Aladhan)
- API key management
  - Environment variables
  - Key restrictions (SHA-1, bundle ID)
  - Key rotation procedures
- Authentication security
  - JWT token storage (SecureStore)
  - Token validation and refresh
  - OTP security and rate limiting
  - Session hijacking prevention
- Data protection
  - Encryption at rest (AES-256)
  - Encryption in transit (TLS 1.3)
  - Data minimization principles
  - Location privacy
  - User data deletion (GDPR/CCPA)
- Row Level Security (RLS) deep dive
  - Testing RLS policies
  - Common policy patterns
  - Performance optimization
- Security monitoring
  - Error tracking (Sentry)
  - Audit logging
  - Suspicious activity detection
- Incident response
  - Data breach protocol
  - API key leak procedures
  - DDoS mitigation
- Compliance (GDPR, CCPA, COPPA)

**Key Sections**:
- Pre-launch security checklist
- Post-launch monitoring tasks
- Incident response playbooks

---

## 📁 Documentation Structure

```
docs/
├── README.md                 # This file - Documentation overview
├── PRD.md                    # Master product requirements document
├── APP_FLOW.md               # User journeys and navigation
├── FRONTEND_DESIGN.md        # UI/UX design system
├── BACKEND.md                # Server architecture and APIs
├── DATABASE_AUTH.md          # Database schema and authentication
├── SUPABASE_AUTH_SETUP.md    # Supabase auth config (URLs, providers)
└── SECURITY.md               # Security guidelines and best practices
```

---

## 🎯 How to Use This Documentation

### For AI Agents (Cursor, Claude, etc.)

**When starting a new task**, identify which documentation file(s) are relevant:

| Task Type | Primary Docs | Secondary Docs |
|-----------|--------------|----------------|
| New feature planning | PRD.md | APP_FLOW.md |
| UI component creation | FRONTEND_DESIGN.md | APP_FLOW.md |
| API implementation | BACKEND.md | DATABASE_AUTH.md, SECURITY.md |
| Database migration | DATABASE_AUTH.md | BACKEND.md, SECURITY.md |
| Navigation/routing | APP_FLOW.md | FRONTEND_DESIGN.md |
| Security audit | SECURITY.md | DATABASE_AUTH.md, BACKEND.md |
| Authentication feature | DATABASE_AUTH.md | BACKEND.md, SECURITY.md |

**Best Practice**: Always read the relevant SKILL.md file (from `/mnt/skills/public/`) first, then reference these docs for project-specific context.

### For Developers

1. **First-time setup**: Read PRD.md in full to understand the project
2. **Daily development**: Keep APP_FLOW.md and FRONTEND_DESIGN.md open for reference
3. **Backend work**: Refer to BACKEND.md and DATABASE_AUTH.md
4. **Security review**: Use SECURITY.md checklist before commits

---

## 🔄 Keeping Documentation Updated

**Update frequency**:
- **PRD.md**: Major updates only (new features, pivot, v2.0)
- **APP_FLOW.md**: Update when adding/changing screens or user flows
- **FRONTEND_DESIGN.md**: Update when adding components or changing design system
- **BACKEND.md**: Update when adding APIs, Edge Functions, or database functions
- **DATABASE_AUTH.md**: Update immediately when schema changes
- **SECURITY.md**: Update when adding security measures or policies

**Version control**: Each document has a version history table at the bottom. Increment version and add entry when making substantial changes.

---

## 🚀 Quick Reference

### Most Common Tasks

**Creating a new screen**:
1. Read `APP_FLOW.md` → Section 9 (User Flows)
2. Read `FRONTEND_DESIGN.md` → Section 3 (Screen Layouts)
3. Reference `PRD.md` → Section 7 (User Interface Design)

**Adding a database table**:
1. Read `DATABASE_AUTH.md` → Section 2 (Complete Schema)
2. Create migration file
3. Add RLS policies (Section 5)
4. Update TypeScript types: `npx supabase gen types typescript`

**Implementing authentication**:
1. Read `DATABASE_AUTH.md` → Section 6 (Authentication System)
2. Read `SUPABASE_AUTH_SETUP.md` for project URL, keys, and Dashboard steps
3. Read `SECURITY.md` → Section 5 (Authentication Security)

**Setting up API integration**:
1. Read `BACKEND.md` → Section 7 (External API Integrations)
2. Read `SECURITY.md` → Section 4 (API Key Management)
3. Update `.env` with API keys

---

## 📝 Documentation Maintenance

**Responsibility**: All contributors should update documentation when making changes.

**Process**:
1. Make code changes
2. Update relevant documentation file(s)
3. Increment version number in document footer
4. Add entry to version history table
5. Commit both code and docs together

---

## 🆘 Need Help?

If these docs don't answer your question:
1. Check the [Supabase docs](https://supabase.com/docs)
2. Check the [Expo docs](https://docs.expo.dev/)
3. Search the codebase for examples
4. Ask in team chat/Discord

---

**Last Updated**: January 29, 2026  
**Documentation Version**: 1.0  
**Next Review**: After MVP launch (March 2026)
