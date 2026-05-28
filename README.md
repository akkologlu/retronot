# Retro App

A real-time retrospective board for agile teams. Runs structured retros through 5 phases: write → group → vote → discuss → summary.

## Tech Stack

- **Next.js 16** (App Router, Server Actions)
- **React 19**
- **Supabase** (Auth, Postgres, Realtime, RLS)
- **Zustand** — client-side state for live retro data
- **Tailwind CSS 4** + shadcn/ui
- **react-dnd** — drag-and-drop card grouping
- **framer-motion** — animations
- **@sentry/nextjs** — error tracking
- **@upstash/ratelimit** — invite link rate limiting
- **Vitest** — unit tests

## Architecture

### Retro Phases

| Phase | Description |
|-------|-------------|
| `lobby` | Participants join before the retro starts |
| `write` | Each user adds cards anonymously per column |
| `group` | Facilitator drags cards into thematic groups |
| `vote` | Participants vote on cards/groups (configurable limit) |
| `discuss` | Moderator walks through items sorted by vote count |
| `summary` | Export as PDF or PNG |

Phase transitions are controlled by the **retro creator** (moderator) via the `advancePhase` server action, which enforces ownership and valid transition order server-side.

### Realtime

`useRetroRealtime` subscribes to Supabase Realtime postgres_changes for all retro tables, plus Presence for ghost-card (typing indicator) feature. State lives in Zustand (`useRetroStore`). A 5-second polling fallback handles any missed events.

### Auth

Email/password + Google OAuth via Supabase Auth. Middleware refreshes sessions on every request. All DB access goes through Row-Level Security policies on the Supabase side.

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd retro
npm install
```

### 2. Environment variables

Copy and fill in `.env.local`:

```env
NODE_TLS_REJECT_UNAUTHORIZED=0          # local dev only
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SENTRY_DSN=...              # optional
NEXT_PUBLIC_BASE_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

For Sentry source maps (optional):
```env
SENTRY_ORG=...
SENTRY_PROJECT=...
SENTRY_AUTH_TOKEN=...
```

### 3. Apply database migrations

In your Supabase dashboard → SQL editor, run migrations in order:

```
supabase/migrations/001_initial_schema.sql → 028_refresh_realtime_action_items.sql
```

Or for a fresh setup, use the consolidated baseline:

```
supabase/migrations/029_baseline.sql
```

### 4. Supabase type generation

After changing the DB schema, regenerate TypeScript types:

```bash
npx supabase gen types typescript \
  --project-id <your-project-id> \
  --schema public \
  > src/types/supabase.ts
```

### 5. Run dev server

```bash
npm run dev
```

## Development

```bash
npm run dev       # Next.js dev server
npm run build     # Production build
npm run lint      # ESLint
npm test          # Vitest watch mode
npm run test:run  # Vitest single run
```

## Key Files

| Path | Purpose |
|------|---------|
| `src/app/actions/retro.ts` | Server actions: createRetro, advancePhase |
| `src/app/actions/team.ts` | Server actions: createTeam, createInviteLink |
| `src/hooks/use-retro-realtime.ts` | Supabase Realtime + Presence subscriptions |
| `src/lib/store/retro-store.ts` | Zustand store for live retro state |
| `src/lib/supabase/client.ts` | Singleton browser Supabase client |
| `src/lib/schemas.ts` | RetroConfig parser/validator |
| `src/lib/ratelimit.ts` | Upstash rate limiter for invite links |
| `src/components/retro/phases/` | Phase-specific board components |
| `supabase/migrations/` | All DB migrations |

## Templates

Three built-in retro templates:

- **Start / Stop / Continue**
- **Sad / Mad / Happy**
- **Keep / Problem / Try**

## Testing

```bash
npm run test:run
```

Tests cover:
- `parseRetroConfig` — config parsing and clamping
- Invite token generation — entropy, format, uniqueness
