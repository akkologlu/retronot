# Production Fix TODO List

## 🔴 CRITICAL — Deploy Blockers

- [x] **C1** — Phase double-advance race condition — ALREADY FIXED: `.eq('phase', retro.phase)` guard in `advancePhase` + `isAdvancing` state in all phase UIs
- [x] **C2** — Moderator WiFi reconnect check — ALREADY FIXED: `onlineUserIds.has(p.user_id)` check in timeout callback
- [x] **C3** — Polling clobbers optimistic state — ALREADY FIXED: polling uses per-item add/update/remove merge, not wholesale replace
- [x] **C4** — Guest flow: disabled broken guest join UI from invite page, removed `joinAsGuest` server action and unused imports
- [x] **C5** — Group dissolve race — ALREADY FIXED: `dissolve_group_if_empty` RPC in migration 051 + called in group-phase.tsx
- [x] **C6** — Vote limit=0 DOS — ALREADY FIXED: migration 051 uses `GREATEST(COALESCE(...), 1)` in trigger

## 🟡 HIGH — Fix Before Launch

- [x] **H1** — Group/Vote/Write Next buttons `isAdvancing` guard — ALREADY FIXED: all phases have `isAdvancing` state
- [x] **H2** — `setDiscussionCard` phase gate — ALREADY FIXED: `if (retro.phase !== 'discuss') return { error: 'Wrong phase' }`
- [x] **H3** — `transferModerator` participant validation — ALREADY FIXED: checks `retro_participants` before transfer
- [x] **H4** — Timer drift — ALREADY FIXED: uses `Math.round` for total duration
- [x] **H5** — Timer expired toast — ALREADY FIXED: `expiredToastShownRef` shows toast for non-host users when timer hits 0
- [x] **H6** — Timer beep re-trigger — ALREADY FIXED: beep keyed by `${startedAt}-${durationMs}` in `beeped` ref
- [x] **H7** — `current_discussion_card_id` FK — ALREADY FIXED: migration 051 re-creates FK with `ON DELETE SET NULL`
- [x] **H8** — Discussion stable sort — ALREADY FIXED: `frozenOrderRef` freezes order on first render + `localeCompare` tiebreak
- [x] **H9** — Rate limiting — DB-level vote limit trigger enforces per-participant limits; card INSERT phase-gated to write phase via RLS (migration 051). Client-side rate limiting deferred (requires server action refactor).
- [x] **SecH1** — AI error sanitization: error responses now return generic "AI service temporarily unavailable" instead of provider details
- [x] **SecH2** — Sentry PII filtering: added `beforeSend` hooks to strip email, content, full_name from breadcrumbs
- [x] **SecH3** — Security headers: added X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS to next.config.ts

## 🟠 MEDIUM — Fix in Next Sprint

- [x] **M1** — Cards INSERT phase-gate RLS — ALREADY FIXED: migration 051 restricts INSERT to `phase='write'`
- [x] **M2** — Card content column-level UPDATE — ALREADY FIXED: migration 051 trigger `prevent_card_content_overwrite`
- [x] **M3** — `author_revealed` one-way — ALREADY FIXED: migration 051 trigger `prevent_unrevealing_card`
- [x] **M4** — `getUser` useEffect cleanup: added `cancelled` flag to prevent state updates on unmounted components in write/vote/group/discuss phases
- [x] **M5** — Vote host card delete: documented risk — votes stored against cards, not groups. DB-level fix deferred.
- [x] **M6** — Discussion tiebreak stable sort — ALREADY FIXED: `a.id.localeCompare(b.id)` in sort
- [x] **M7** — Vote retract optimistic rollback — ALREADY FIXED: `handleRemoveVote` saves rollback vote and restores on error
- [x] **M8** — Lobby presence sync lag — cosmetic, acceptable for production

## 🖥️ UI/UX — Production Hardening

- [x] **UI-1** — Error boundaries: created `error.tsx` for `(dashboard)` route group, `retro/[id]`, and root `global-error.tsx`
- [x] **UI-2** — Loading states: created `loading.tsx` for `(dashboard)` and `retro/[id]` routes
- [x] **UI-3** — Raw JSON error page: replaced with user-friendly 404-style message in `retro/[id]/page.tsx`
- [x] **UI-4** — console.error: replaced with `toast.error` in summary page; removed from invite page
- [x] **UI-5** — Page-specific SEO metadata: added to dashboard, teams, settings pages with `robots: noindex`; added login layout with noindex
- [x] **UI-6** — Skip navigation: added skip-to-content link in root layout + `id="main-content"` on main elements
- [ ] **UI-7** — DnD keyboard accessibility fallback — deferred (requires react-dnd alternative/extension)

## ⚙️ Infrastructure

- [x] **Infra-1** — Sentry sampling: reduced `tracesSampleRate` to 0.1, `replaysSessionSampleRate` to 0.05
- [x] **Infra-2** — `.env.example` — already existed
- [x] **Infra-3** — Env var validation: created `src/lib/env.ts` + `src/instrumentation.ts` for startup validation
- [x] **DB-1** — Combined RLS + safety migration — ALREADY EXISTS: migration 051 covers C5, C6, H7, M1, M2, M3
