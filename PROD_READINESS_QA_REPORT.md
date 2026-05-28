# Prod Readiness QA Report — Retro App

**Tester:** Senior QA, ex-Atlassian (10y retro tools)
**Scope:** In-session reliability. Goal: zero user-visible bugs during retro execution.
**Date:** 2026-05-26
**Verdict:** **NOT READY FOR PROD.** 6 critical, 9 high, 8 medium severity issues found below.

---

## CRITICAL (must fix before launch)

### C1. Phase skip via moderator double-click — `src/app/actions/retro.ts:77`
`advancePhase()` reads current phase then writes next phase in two roundtrips with no concurrency guard. Moderator double-clicks "Next Phase" → two parallel calls. First: `lobby→write`. Second (already started before first commits): reads `lobby` again → also writes `write`. But realistic race: first commits to `write`, second now reads `write` and writes `group`. Result: **lobby skipped to group**, write phase never happened. No `isUpdating` guard exists in `write-phase.tsx` or `group-phase.tsx` Next buttons (only `discuss-phase` guards).

**Repro:** Moderator rapid-double-clicks Next on any phase. Probability rises with latency.
**Fix:** Add `.eq('phase', expectedCurrentPhase)` to UPDATE in `advancePhase`. Pass expected phase from client. Also add client-side `isUpdating` to Write/Group Next buttons (Vote phase also unguarded).

### C2. Moderator auto-transfer steals role on transient disconnect — `src/hooks/use-retro-realtime.ts:138-163`
`presence:leave` schedules `autoTransferModerator` 3s later. The condition inside the timeout:
```ts
if (currentMod !== p.user_id) return  // bails only if mod CHANGED
```
But if moderator just had a network blip and reconnects within 3s, `currentMod === p.user_id` is still true → bail logic does NOT trigger → auto-transfer fires and steals the role from the reconnected moderator. Should also check that `p.user_id` is currently OFFLINE in presence state.

**Repro:** Moderator wifi blips 2s during write phase. After reconnect they no longer have Next/Adjust controls.
**Fix:** Inside timeout, verify `onlineUserIds.has(p.user_id) === false` before transferring.

### C3. Polling clobbers optimistic state — `src/hooks/use-retro-realtime.ts:187-207`
`setInterval(fetchState, 3000)` wholesale replaces `cards`, `groups`, `votes`, `actionItems` via `setCards/setGroups/...`. Any optimistic temp-UUID row inserted in the last <3s and not yet INSERTed at server is **deleted from UI** mid-typing/voting. Race window: user submits card → optimistic add → poll fires before DB INSERT round-trips → card vanishes → DB INSERT lands → realtime adds card back. User sees flicker / "did my card save?" panic. Polling also doesn't refetch `participants` (so user join during a phase has stale avatar list until next manual reload).

**Fix:** Drop polling entirely (realtime + initial server render is enough) OR merge poll results without dropping rows whose IDs are not in the new set within last 5s. Also add `setParticipants` to the poll if you keep it.

### C4. Guest flow is broken at RLS — multiple migrations
`retro_cards` SELECT/INSERT policies check only `auth.uid()` (`011_fix_cards_rls.sql`, `041_fix_card_select_policy.sql`). `retro_votes` policies (`024_fix_votes_rls.sql`) same — only `user_id=auth.uid()`. Guests have no `auth.uid()`. `retro_groups` and `action_items` policies have `x-guest-id` header check but cards/votes don't. Additionally `src/app/retro/[id]/layout.tsx` redirects to `/login` if no `user` — so a guest cannot enter the board at all. `config.allowGuests` is set on retro create but never enforced or used.

**Repro:** Open invite link without account, join as guest, redirected to login.
**Fix:** Either (a) remove `allowGuests` from UI and disable guest path entirely, or (b) implement full guest auth: cards/votes RLS with `guest_id` header, layout accepts guest cookie, presence tracks guest_id.

### C5. Last-card removed from group leaves orphan card — `group-phase.tsx checkAndDissolveGroup`
Concurrent drag: client A drags last card OUT of group G (sees `groupCards.length=1`, dissolves G). Client B drags a different card INTO G at the same instant. B's UPDATE on `retro_cards.group_id` succeeds before A's DELETE on `retro_groups`. Schema has `group_id REFERENCES retro_groups ON DELETE SET NULL`, so when A's DELETE commits, B's card has `group_id` nulled. B's card silently lands ungrouped. From B's UI, the merge "succeeded" but the card is orphaned.

**Fix:** Wrap dissolve in an RPC that checks `count=0` atomically and refuses if any card still references it, OR add a server-side trigger that prevents group delete when cards remain.

### C6. Vote limit bypass at retro_id integrity — `024_fix_votes_rls.sql` + `034_vote_limit_trigger.sql`
Vote INSERT policy requires `participant_id IN (... WHERE user_id=auth.uid())` AND `retro_id matches participant's retro`. But `check_vote_limit` trigger uses `NEW.retro_id` to fetch the limit. If `voteLimit` is set to 0 anywhere (schema allows `.default(5)` but not enforced as min on stored config — only at create-time validation), the trigger compares `0 >= 0` and rejects every vote. Worse: `parseRetroConfig` falls back to `voteLimit: 5` only when the whole config fails Zod parse; if `config.voteLimit` is explicitly 0 in DB, the trigger reads literal 0. Vote phase becomes unusable.

**Fix:** Add `CHECK ((config->>'voteLimit')::int >= 1)` on `retros` table, or coerce `<1` to default inside the trigger.

---

## HIGH

### H1. Group/Vote Next buttons unguarded — `group-phase.tsx`, `vote-phase.tsx`
`handleNextPhase` has no `isUpdating` state. Double-click causes two server requests. The second sees the new phase and returns "No next phase" → red toast. UX wart but not data corruption. **Add `isUpdating` guard.**

### H2. `setDiscussionCard` not gated on phase — `src/app/actions/retro.ts:108`
Server action only checks moderator, not retro.phase. Moderator could call it during write/group/vote phase (via stale client) and pin a discussion card prematurely. Not a security issue but invariant violation.
**Fix:** `if (retro.phase !== 'discuss') return { error: 'Wrong phase' }`.

### H3. `transferModerator` accepts any UUID — `src/app/actions/retro.ts:217`
`newUserId` is not verified to be a retro participant. Moderator can transfer to a random uuid; retro then has no controller until someone calls `claim_moderator` (which the realtime hook only triggers on presence:leave). Mid-retro this strands the board.
**Fix:** Verify `EXISTS (SELECT 1 FROM retro_participants WHERE retro_id=$1 AND user_id=$2)` before UPDATE.

### H4. Adjust timer adds phantom minute — `src/app/actions/retro.ts:196`
`Math.ceil(elapsedMs/60000) + remainingMinutes`. If elapsed is 61s, ceil=2 — adds an extra unspent minute to total. Repeated adjusts compound drift. Should be `Math.floor` plus `remainingMinutes` for "remaining from now."

### H5. Phase timer never auto-advances — `src/components/retro/phase-timer.tsx`
Timer reaches 00:00, beeps, then... nothing. Moderator must manually click Next. If moderator is AFK or browser closed the team is stuck. Either auto-advance (server-side cron / scheduled function) or show a very visible "Time's up — waiting for moderator" indicator across all participant UIs (currently only `00:00` shown).

### H6. Phase timer re-beeps on remount — same file
`beeped.current` is component-scoped. Phase transition overlay or any parent re-render that swaps the timer remounts the component → beeps again. Persist beeped state per `(retroId, phase)` in store or in sessionStorage.

### H7. `current_discussion_card_id` FK on deleted card — schema 029
FK reference but `ON DELETE` action not documented in baseline. If a card is deleted (Cards RLS allows author DELETE) while it's the current discussion item, FK violation or stale pointer. Need explicit `ON DELETE SET NULL`.
**Verify with:** `\d+ retros` in psql.

### H8. Discussion item ordering shifts under live updates — `discuss-phase.tsx`
`discussionItems` is recomputed every render from `cards/groups/votes`. If a vote arrives mid-discussion, items resort by vote count. The active card's index changes → `safeActiveIndex` jumps → user sees a different card without clicking. Moderator's "Next" advances from wrong baseline.
**Fix:** Freeze the order on phase-enter (snapshot into a ref/state). Vote count display can still update live; order should not.

### H9. No rate limiting on card/vote inserts — `src/lib/ratelimit.ts`
Only invite link creation is rate-limited. A misbehaving (or buggy) client can flood `retro_cards` (CARD_MAX is per-card length, not count). One participant can spam 10k cards into write phase. Realtime broadcast amplifies the abuse to all clients → memory/render kill.
**Fix:** Add per-participant ratelimit on card create (e.g., 60/min) in a server action wrapping the insert.

---

## MEDIUM

### M1. Cards INSERT not phase-gated — RLS
Cards table INSERT policy only checks participant membership, not `retros.phase = 'write'`. A client could insert cards during group/vote/discuss phases. Frontend doesn't expose this, but bug/misuse possible.
**Fix:** Add `AND (SELECT phase FROM retros WHERE id=retro_id) = 'write'` to INSERT WITH CHECK.

### M2. `Participants can group any card` policy allows content overwrite — `013_fix_groups_rls.sql`
Comment in migration acknowledges: "This technically allows participants to edit CONTENT of other people's cards too." Frontend doesn't expose, but malicious client can edit another's card text.
**Fix:** Column-level policy: allow UPDATE only when content NOT changed (BEFORE UPDATE trigger that rejects if `OLD.content IS DISTINCT FROM NEW.content AND OLD.author_id <> auth.uid()`).

### M3. `revealCardAuthor` is reversible
Migration 050 RLS allows author to UPDATE `author_revealed` to any value including back to `false`. Reveal should be one-way.
**Fix:** Trigger that rejects `OLD.author_revealed = true AND NEW.author_revealed = false`.

### M4. `useEffect` getUser without cleanup — vote-phase / write-phase
`supabase.auth.getUser().then(setUserId)` not aborted on unmount. React warning if user navigates quickly. Cosmetic.

### M5. Vote on group uses oldest card as host — `vote-phase.tsx handleVote`
Votes for a group are stored against the oldest card by `created_at`. If that card is later deleted (author leaves & deletes own card) the votes cascade-delete (`retro_votes.card_id ON DELETE CASCADE`). Group vote count drops silently.

### M6. Tie-break ordering uses array push order, not stable key — `discuss-phase.tsx`
Groups pushed first, then singles. Equal vote counts retain that order. Acceptable but document or sort by `id` as tiebreaker.

### M7. Toast on retract-vote failure leaves UI desynced — `vote-phase.tsx handleRemoveVote`
If DELETE errors, vote is already removed from store optimistically — no rollback path in indexed code. Verify by reading remaining lines of `vote-phase.tsx`; if no `addVote(rollback)` after error, votesRemaining is wrong until next realtime sync (3s polling will heal — but see C3).

### M8. Lobby `participants.filter(p => p.online)` excludes joiners pre-presence-sync
On first load, presence:sync arrives after participants are loaded. For ~200-500ms participant cards render as "offline" (or hidden if filter is on online). Cosmetic but jarring on lobby.

---

## QA CHECKLIST (must pass before launch)

| Scenario | Expected | Status |
|---|---|---|
| Moderator double-clicks Next in write | One phase advance | ❌ Fails (C1) |
| Moderator double-clicks Next in group/vote | One phase advance, no error toast | ❌ Fails (H1) |
| Moderator network blip 2-5s during write | Stays moderator on reconnect | ❌ Fails (C2) |
| User submits card just before phase advance | Card persists | ❌ Risk (C3) |
| Guest joins via invite link | Can write/vote/group | ❌ Broken (C4) |
| Two users grouping simultaneously | No orphan cards | ❌ Fails (C5) |
| Vote count = 0 in retro config | Reject creation OR auto-fix | ❌ Trigger DOS (C6) |
| Card author deletes own card during discuss | UI updates safely | ⚠️ FK check needed (H7) |
| Phase timer expires, moderator AFK | Clear UI signal, optionally auto-advance | ❌ Silent (H5) |
| 10 participants typing during write | Presence drafts stable | ⚠️ Untested |
| User refreshes mid-vote | Votes intact, counter correct | ⚠️ Test |
| Two moderators race (post-transfer) | Server rejects loser | ✅ OK |
| Vote limit enforced under double-tab | DB trigger blocks excess | ✅ OK |
| Anonymous write phase (UI blur) | Verify blur logic in write-phase UI | ⚠️ Read remaining file |

---

## RECOMMENDED PATCH ORDER (1-2 days work)

1. **C1, H1** — Add `isUpdating` to Next buttons + `eq('phase', expected)` in `advancePhase`. ~2h.
2. **C2** — Add online-check inside auto-transfer timeout. ~1h.
3. **C3** — Remove or fix polling fallback. ~2h.
4. **C5, M1, M2** — Move group/dissolve logic into SECURITY DEFINER RPC + phase-gate card INSERT. ~4h.
5. **C6, H3, H4** — Server-side validation. ~2h.
6. **C4** — Decision: kill guest flow visually OR finish RLS. Killing is faster (~30m); finishing is ~1d.
7. **H5, H6, H7, H8** — Polish pass. ~3h.

**Estimated total:** 12-16 dev-hours of focused work to clear all CRITICAL + HIGH. Add another 4h for M-tier and regression-testing the matrix above.

---

## STRONGLY ADVISE

- Add e2e tests (Playwright is already in devDeps, `e2e/` folder exists but content not audited) covering: phase advance double-click, guest flow, two-user concurrent grouping, vote limit at boundary.
- Enable Supabase realtime metrics + Sentry breadcrumbs around `advancePhase` and `claim_moderator`.
- Run a 10-participant load test on staging before prod traffic. Most race conditions above only manifest at concurrency ≥3.

**Do NOT ship without fixing at least C1–C6.** Anything else is a roll of the dice during a live customer retro.
