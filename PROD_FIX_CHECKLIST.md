# Prod Fix Checklist — Retro App

**Kaynak:** `PROD_READINESS_QA_REPORT.md` (2026-05-26)
**Durum:** NOT READY. C1–C6 ship-blocker.
**Tahmini efor:** 12–16 dev-saat (CRITICAL + HIGH), +4h MEDIUM.

---

## CRITICAL (ship-blocker)

- [ ] **C1 — Phase double-advance race** — `src/app/actions/retro.ts:77`
  - `advancePhase` UPDATE'ine `.eq('phase', expectedCurrentPhase)` ekle.
  - Client'tan expected phase geç.
  - Write / Group / Vote Next button'larına `isUpdating` guard ekle (şu an sadece `discuss-phase.tsx` korunuyor).
  - Tahmin: 2h.

- [ ] **C2 — Moderator auto-transfer wifi blip'te rol çalıyor** — `src/hooks/use-retro-realtime.ts:138-163`
  - 3s timeout içinde `onlineUserIds.has(p.user_id) === false` kontrolü ekle.
  - Tahmin: 1h.

- [ ] **C3 — Polling optimistic state'i siliyor** — `src/hooks/use-retro-realtime.ts:187-207`
  - `setInterval(fetchState, 3000)` ya tamamen kaldır (realtime yeter) ya da son 5sn içindeki temp-UUID row'ları koruyan merge yap.
  - Korunursa `setParticipants` da ekle.
  - Tahmin: 2h.

- [ ] **C4 — Guest flow kırık** — `retro_cards` / `retro_votes` RLS + `src/app/retro/[id]/layout.tsx`
  - Karar: (a) `allowGuests` UI'ı kaldır, guest path'i kapat (~30m), VEYA (b) `guest_id` header RLS + layout guest cookie + presence guest tracking (~1 gün).
  - Tahmin: 30m – 1d.

- [ ] **C5 — Concurrent dissolve orphan card** — `src/components/retro/phases/group-phase.tsx checkAndDissolveGroup`
  - Dissolve mantığını SECURITY DEFINER RPC'ye taşı, atomic `count=0` kontrolü.
  - VEYA server-side trigger: `retro_groups` DELETE'i blokla eğer hala referans veren card varsa.
  - Tahmin: 4h (M1+M2 ile birlikte).

- [ ] **C6 — Vote limit=0 trigger DoS** — `024_fix_votes_rls.sql` + `034_vote_limit_trigger.sql`
  - `retros` tablosuna `CHECK ((config->>'voteLimit')::int >= 1)` ekle.
  - VEYA trigger içinde `<1` değeri default'a coerce et.
  - Tahmin: 1h.

---

## HIGH

- [ ] **H1** — Group/Vote Next button `isUpdating` guard. (`group-phase.tsx`, `vote-phase.tsx`)
- [ ] **H2** — `setDiscussionCard` phase gate: `if (retro.phase !== 'discuss') return error`. (`actions/retro.ts:108`)
- [ ] **H3** — `transferModerator` target user'ın retro participant olduğunu doğrula. (`actions/retro.ts:217`)
- [ ] **H4** — Adjust timer drift: `Math.ceil` yerine `Math.floor` veya doğrudan remaining. (`actions/retro.ts:196`)
- [ ] **H5** — Timer expiry'de auto-advance VEYA "Time's up — waiting for moderator" tüm UI'larda görünür. (`phase-timer.tsx`)
- [ ] **H6** — `beeped.current` `(retroId, phase)` bazında sessionStorage / store'a persist et. (`phase-timer.tsx`)
- [ ] **H7** — `current_discussion_card_id` FK için `ON DELETE SET NULL` doğrula (psql `\d+ retros`). (schema 029)
- [ ] **H8** — Discuss item ordering: phase-enter'da snapshot al, live vote ordering değiştirmesin. (`discuss-phase.tsx`)
- [ ] **H9** — Card/vote insert için per-participant rate limit (örn. 60/min). (`src/lib/ratelimit.ts`)

---

## MEDIUM

- [ ] **M1** — Cards INSERT RLS phase gate: `phase='write'` zorunlu.
- [ ] **M2** — Group UPDATE policy column-level: `content` değişikliği reddet. (`013_fix_groups_rls.sql`)
- [ ] **M3** — `author_revealed` one-way trigger: `true → false` reddet. (migration 050)
- [ ] **M4** — `getUser` useEffect cleanup / abort. (vote-phase, write-phase)
- [ ] **M5** — Group vote host card silindiğinde cascade kaybı. (`vote-phase.tsx handleVote`)
- [ ] **M6** — Tiebreak: `id` ile stable sort. (`discuss-phase.tsx`)
- [ ] **M7** — Retract-vote DELETE hatasında optimistic rollback. (`vote-phase.tsx handleRemoveVote`)
- [ ] **M8** — Lobby presence:sync gecikmesinde participant flash. (cosmetic)

---

## QA Senaryoları (launch öncesi geçmeli)

| Senaryo | Beklenen | Durum |
|---|---|---|
| Moderator Write Next double-click | 1 phase ilerle | ❌ C1 |
| Moderator Group/Vote Next double-click | 1 ilerle, error toast yok | ❌ H1 |
| Moderator 2-5s wifi blip | Reconnect'te mod kalır | ❌ C2 |
| Phase advance'ten hemen önce card submit | Card kalıcı | ❌ C3 risk |
| Guest invite link | Write/vote/group yapabilir | ❌ C4 |
| 2 user eşzamanlı grouping | Orphan card yok | ❌ C5 |
| `voteLimit=0` config | Reject veya auto-fix | ❌ C6 |
| Author kendi card'ını discuss sırasında silerse | UI güvenli güncellenir | ⚠️ H7 |
| Timer expiry, mod AFK | Net sinyal, opsiyonel auto-advance | ❌ H5 |
| 10 katılımcı write phase | Presence draft stable | ⚠️ test |
| Mid-vote refresh | Vote/sayaç doğru | ⚠️ test |
| Post-transfer iki mod yarışı | Server loser reddeder | ✅ |
| Double-tab vote limit | DB trigger bloklar | ✅ |
| Anonymous write blur | Blur mantığı doğrula | ⚠️ |

---

## Patch Sırası (önerilen)

1. C1 + H1 — Next buttons `isUpdating` + `eq('phase')`. **~2h**
2. C2 — auto-transfer online check. **~1h**
3. C3 — polling kaldır / merge-safe. **~2h**
4. C5 + M1 + M2 — dissolve RPC + phase gate + content protect. **~4h**
5. C6 + H3 + H4 — server validation. **~2h**
6. C4 — karar: guest UI kapat (~30m) VEYA full guest path (~1d).
7. H5 + H6 + H7 + H8 — polish. **~3h**

---

## Şiddetle Tavsiye

- Playwright e2e: phase double-click, guest flow, concurrent grouping, vote limit boundary.
- Supabase realtime metrics + Sentry breadcrumbs (`advancePhase`, `claim_moderator`).
- Staging'de 10 katılımcılı load test. Yarışların çoğu concurrency ≥3'te tetikleniyor.

**Min ship gate: C1–C6 tamam.** Altı = canlı retro Rus ruleti.
