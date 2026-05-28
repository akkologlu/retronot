# Retro App — Proje İnceleme Raporu

**Tarih:** 2026-05-24
**Kapsam:** UI, akış (UX), mimari, güvenlik, veri modeli, gerçek zamanlı altyapı.
**Yöntem:** `src/` ve `supabase/migrations/` altındaki kodun statik analizi.

---

## TL;DR — En Kritik 5 Madde

1. **Server Action input validation yok.** `createRetro`, `createTeam`, `updateProfile`, `joinAsGuest` formData’yı `as string` cast’iyle alıyor. Zod ile sınırlandırılması şart.
2. **Tek moderatör tek nokta hatası.** `advancePhase` yalnızca `created_by = auth.uid()` kontrolü yapıyor. Moderatör düşerse retro kilitleniyor. Co-moderator / takım sahibi devri yok.
3. **Faz başına süre (timer) yok.** Write/group/vote fazlarında zaman kutusu yok — temel retro UX eksiği.
4. **Guest akışı yarım.** `joinAsGuest` cookie set ediyor ama RLS `x-guest-id` **header**’ı bekliyor. Browser fetch’i bu header’ı otomatik göndermez → guest gerçek zamanlı veri göremez.
5. **Anonimlik sızıntısı.** Write fazında karta `blur-sm` uygulanıyor ama `retro_cards.author_id` realtime payload’unda herkese gönderiliyor. Anonimlik salt görsel; DB seviyesinde çözük değil.

---

## 1. Mimari Bulgular

### 1.1 Migration Klasörü Disiplinsiz
- `001`–`028` → çoğu `fix_rls_*` deneme. Sonra `029_baseline.sql` (15KB) gelmiş.
- `030`, `031` baseline sonrası yeni fix’ler.
- `996_check_template.sql`, `997_*`, `998_*`, `999_reload_schema.sql` → bunlar **check** dosyası, migration değil. Yanlış konumda; `supabase db push` zincirini kirletiyor.

**Öneri:** `029_baseline.sql`’den önceki dosyaları arşivle (`supabase/migrations/archive/`). `996–999` dosyalarını `supabase/checks/` veya `scripts/`’a taşı.

### 1.2 `parseRetroConfig` Elle Yazılmış — Zod Yok
`src/lib/schemas.ts`:
```ts
export function parseRetroConfig(config: unknown): RetroConfig {
  if (!config || typeof config !== 'object') return { ... }
  // typeof kontrolleri elle
}
```
- `lib/schemas.ts` ismi var ama Zod yok. `package.json`’a zaten eklenmiş mi kontrol edilmeli; eklenmediyse eklenmeli.
- Tüm server action’lar `formData.get('name') as string` yapıyor — runtime kontrol yok. Boş string, 10MB string, SQL injection denemesi → her şey insert edilebilir.

**Öneri:** `lib/schemas.ts`’i Zod ile yeniden yaz. Tüm server action’lar `Schema.parse(Object.fromEntries(formData))` ile başlasın.

### 1.3 Server Action Yetki/Faz Kontrolü Eksik
`advancePhase`:
```ts
if (retro.created_by !== user.id) return { error: 'Not authorized' }
```
- Doğru, ama:
  - Faz geçişi sırasında DB tarafında **`UPDATE retros SET phase = X WHERE phase = Y`** koşullu update yok → iki moderatör (gelecekte) yarış koşulu yapabilir.
  - **`createCard`, `castVote`, `createGroup` gibi server action’lar yok.** Direkt `supabase.from(...)`.insert client’tan yapılıyor. RLS koruyor ama:
    - Vote phase’deyken `retro_cards.insert` engellenmiyor — yalnız RLS participant kontrolü var, **faz kontrolü yok**.
    - Vote limit (`voteLimit = 5`) RLS’te değil, UI’da. Client doğrudan 100 vote insert edebilir.

**Öneri:** Faz ve oy limiti DB seviyesinde RLS `WITH CHECK` veya Postgres `BEFORE INSERT` trigger ile zorlanmalı. En azından bir `cast_vote` RPC fonksiyonu (SECURITY DEFINER) yazılmalı.

### 1.4 `current_discussion_card_id` Kolonu Ölü
- Migration 029 → `retros.current_discussion_card_id UUID` var, FK retro_cards’a bağlı.
- `discuss-phase.tsx` ise navigation’ı yalnızca **client `useState` ve `useRef`** ile yapıyor.
- Sonuç: katılımcılar farklı kartlarda olabilir; “moderatör nereye baktığını gör” fonksiyonu yok.

**Öneri:** Discuss phase navigation kararlarını `retros.current_discussion_card_id` üzerinden realtime sync’le. UI’de katılımcılar moderatörle aynı kartı görsün.

### 1.5 Realtime Hook’ta Tip Güvenliği Yok
`use-retro-realtime.ts` — 15+ adet `as any` ve `eslint-disable-line`. Postgres changes payload’u tiplenebilir (`RealtimePostgresChangesPayload<Card>`). Şu anki kod compile-time güvenliği yok; payload şeması değiştiğinde sessiz bozulur.

### 1.6 5-saniyelik Polling Fallback README’de Var, Kodda Yok
README:
> A 5-second polling fallback handles any missed events.
Hook’ta polling yok — yalnızca subscribe. Realtime düşerse veri kaybolur.

**Öneri:** Ya README’den iddiayı kaldır, ya da `setInterval(refetch, 5000)` + `channel.subscribe((status) => ...)` reconnect mantığı ekle.

### 1.7 Layout’ta `getUser()` Çift Çağrı
`/retro/[id]/layout.tsx` her render’da `auto-join` insert deniyor. Sayfa her refresh’te:
- `participants` select
- yoksa insert
- ardından client tarafta tekrar realtime channel subscribe

Insert sırasında `unique(retro_id, user_id)` constraint var (migration 029), ama her sayfa yüklemesinde sessiz `409` üretiyor. `.onConflict('retro_id,user_id').ignore()` veya pre-check ile temizlenmeli.

---

## 2. UI / UX Bulgular

### 2.1 Mobil Yok Sayılmış
- `react-dnd` + `HTML5Backend` → **touch desteği yok**. Telefonda group fazında kart sürüklenemez.
- `ParticipantsSidebar` → `hidden md:flex`. Mobil katılımcı listesini hiç göremiyor.
- Genel layout `h-screen` — mobile virtual keyboard açıldığında board kayar.

**Öneri:** `react-dnd-multi-backend` veya `TouchBackend`. Mobile için sticky bottom drawer’da katılımcı listesi.

### 2.2 Yazma Fazı UX
- Kart **edit** yok. Sadece delete. Tıklayıp düzeltme istenir.
- “Hidden Content” + `blur-sm` → herkes kaç kart yazıldığını görüyor ama içerik blur. Bu “anonim” ifadesini yarı karşılıyor; ama tipik retro tool’larında **yazılma sırasında diğerleri kart sayısını da görmemeli** (sadece “yazıyor” göstergesi). Drafts presence buraya bağlı, iyi adım.
- “Submit” butonuyla card insert: optimistic update yok (verify edilmeli). Yavaş bağlantıda double-tap → duplicate kart riski.

### 2.3 Group Fazı UX
- Grup **adı/etiketi** yok. Migration 029’da `retro_groups.label` var mı kontrol edilmeli; varsa UI’de görünmüyor.
- Tek kart kaldığında auto-dissolve var (iyi). Ama **undo yok**.
- `column_name` mantığı: grup ilk kartın kolonunu alıyor. Cross-column grup (örn. “Stop” + “Start” birleştirme) yapamıyorsun.

### 2.4 Vote Fazı UX
- Vote limit UI’da hard cap, ama görsel feedback yetersiz. ParticipantsSidebar’daki dots iyi başlangıç ama:
  - Kalan oy sayacı her zaman görünmüyor.
  - **Oy geri çekme (re-vote)** akışı belirsiz.

### 2.5 Discuss Fazı UX
- Action item **assignee yok**. `action_items` tablosunda `assigned_to` kolonu yoksa ekle.
- Action item **due date yok**.
- Moderator dışı katılımcı yalnız “Waiting for moderator to navigate” mesajı → ne kart görüyorlar tartışmalı. Realtime sync (madde 1.4) çözer.
- Action item realtime ekleniyor ama **kim ekledi** belli değil.

### 2.6 Faz Geçiş Overlay
- 5 faz için config var, animasyon güzel. Ama:
  - Her geçiş `setOverlayPhase` ile başlıyor — kullanıcı F5’lerse overlay yine tetiklenir mi? `prevPhaseRef` mount sırasında null, ilk tetiklenmiyor, ok.
  - Overlay süresi sabit; uzun toplantıda yorucu. **Skip butonu** eklenebilir.

### 2.7 Dashboard
- Tüm retroları tek listede gösteriyor; ekip filtresi yok.
- “Active” / “Completed” ayrımı var ama **arşivleme yok**, **silme yok**.
- Çok sayıda retro birikince tablo yerine grid mantığı kalabalık.

### 2.8 Sidebar / Navigation
- Sidebar `user dropdown` ağırlıklı. Hızlı erişim için **son retro, mevcut takım** kısayolu eksik.
- “Settings” sayfası muhtemelen sadece full_name (sıradan).
- Theme toggle (dark/light) yok — globals.css’te tema değişkenleri varsa eklemek 30 dk’lık iş.

### 2.9 Lobby
- Davet linki oluşturma var. Ama:
  - Tek kullanımlık vs çoğul kullanımlık seçimi yok.
  - **QR kod yok** — yüz yüze toplantılarda telefon kullanan için sürtünme.
- “Leave retro” / “Kick participant” yok.

### 2.10 Login / OAuth
- Sadece Google + email/password. **Magic link**, **GitHub/Microsoft** yok.
- **Password reset flow** verify edilmeli; görünmüyor.
- Login sonrası `next=` yönlendirmesi var; redirect open-redirect kontrol edilmeli (origin check).

---

## 3. Güvenlik Bulgular

### 3.1 Sentry Replay PII Risk
`sentry.client.config.ts`:
```ts
replaysSessionSampleRate: 0.1
replaysOnErrorSampleRate: 1.0
integrations: [Sentry.replayIntegration()]
```
- `maskAllText` / `blockAllMedia` opsiyonu **yok**. Anonim retro kartları default olarak Sentry’ye gidiyor.
- **Acil:** `replayIntegration({ maskAllText: true, blockAllMedia: true })`.

### 3.2 Anonim Kart İçeriği Database’den Sızabilir
- `retro_cards` RLS: tüm participant kartları okuyabilir → `author_id` her zaman payload’da.
- Client `blur-sm` görsel kamuflaj. DevTools açan herkes `cards.find(...).author_id` ile yazarı eşleyebilir.

**Öneri:** Write fazında RLS SELECT policy:
```sql
USING (
  author_id = auth.uid()
  OR (SELECT phase FROM retros WHERE id = retro_id) != 'write'
)
```
Veya `author_id`’yi nullable yap, write fazı dışında zenginleştirme RPC ile yap.

### 3.3 Open Redirect Riski — Login `next` Param
`src/app/auth/callback/route.ts`:
```ts
const next = searchParams.get('next') ?? '/'
return NextResponse.redirect(`${origin}${next}`)
```
- `next=//evil.com` → `origin//evil.com` → browser’a göre evil.com’a gidebilir. Path’in `/` ile başladığını doğrula:
```ts
const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'
```

### 3.4 Rate Limit Sadece Invite Link
- `createRetro`, `createTeam`, `castVote` (client-side), `addCard` (client-side) → rate limit yok. Tek kullanıcı dakikada 1000 kart insert edebilir; DB ve realtime patlar.

### 3.5 Action Item / Card Length Limit Yok
- DB’de `content` text. Length check yok. 1MB kart insert edilebilir.

### 3.6 CSRF
Next.js Server Actions origin check yapıyor (`Origin` header). Yine de prod’da `next.config.ts` `experimental.serverActions.allowedOrigins` set edilmiyor.

---

## 4. Veri Modeli Bulgular

### 4.1 `retro_groups.label` / Renk
- Grup adı tipik bir feature. Migration’da kolon var mı yok mu net değil. Yoksa eklenmeli.

### 4.2 `action_items` Eksik Kolonlar
Önerilen eklemeler:
- `assigned_to_user_id UUID REFERENCES users(id)`
- `due_date DATE`
- `priority TEXT CHECK (...)`
- `created_by UUID REFERENCES users(id)`

### 4.3 `retros.archived_at TIMESTAMPTZ`
Soft delete için. Dashboard filtrelemesi için temel.

### 4.4 Index Eksikleri
Migration 014 bazı index’leri ekliyor. Eksik olabilecekler:
- `retro_votes(retro_id, participant_id)` — vote limit query’si için
- `retro_cards(retro_id, group_id)` — group phase için
- `action_items(retro_id, card_id)` — discuss phase için

### 4.5 RLS Recursion Riski
Migration listesi:
- `004_fix_recursion_final`, `021_fix_infinite_recursion`
- `is_team_member()` helper SECURITY DEFINER mı? Değilse RLS içinde tekrar tekrar `team_members`’a bakar → recursion.

---

## 5. Geliştirme Akışı / DX

### 5.1 Test Coverage Düşük
- `src/test/` yalnızca `crypto.test.ts` + `schemas.test.ts`. Server action testi, RLS policy testi, realtime testi yok.
- E2E test (Playwright) yok. Retro flow gibi multi-step UX için kritik.

### 5.2 Type Generation Manuel
- `supabase.ts` (`wc -l`) ne kadar güncel belirsiz. CI’da `supabase gen types typescript` yapılmıyorsa drift olur.
- `as any` ve `as unknown as TeamWithCount[]` cast’ları drift’in işareti.

### 5.3 ESLint Disable Yoğun
- Realtime hook’ta her `as any`’ye ayrı disable. Tip stratejisi düzeltilmeli.

### 5.4 `.env` Doc Eksik
- `NEXT_PUBLIC_BASE_URL`, `UPSTASH_REDIS_REST_URL`, Sentry env, Supabase env → `.env.example` var mı? Yoksa eklenmeli.

---

## 6. Önerilen Roadmap (Öncelik Sırası)

| # | Madde | Etki | Efor |
|---|------|------|------|
| 1 | Server action’lara Zod validation | Güvenlik+Stabilite | S |
| 2 | OAuth callback `next` param sanitize | Güvenlik | XS |
| 3 | Sentry replay `maskAllText` | Gizlilik | XS |
| 4 | RLS write-phase `author_id` gizleme | Anonimlik | M |
| 5 | Faz başı timer (config’e `phaseTimers`) | UX core feature | M |
| 6 | Touch backend (mobil group fazı) | Erişilebilirlik | S |
| 7 | Card edit + Action item assignee | UX | S |
| 8 | `current_discussion_card_id` realtime sync | UX | S |
| 9 | Migration klasör temizliği + check’leri taşı | DX | XS |
| 10 | E2E test (Playwright) — happy path | Stabilite | L |
| 11 | Retro arşivleme (`archived_at`) + dashboard filtre | UX | S |
| 12 | Co-moderator / moderatör devri | Resilience | M |
| 13 | Vote / card rate limit (Upstash) | Güvenlik | S |
| 14 | Magic link login + password reset | UX | S |
| 15 | QR kod davet linki | UX | XS |
| 16 | Theme toggle (dark mode) | UX | S |
| 17 | Custom template builder | Feature | L |
| 18 | Realtime tip güvenliği (`as any` temizliği) | DX | M |

**Efor:** XS<1g, S=1–2g, M=3–5g, L>1hf.

---

## 7. Hızlı Kazanımlar (1 Gün İçinde Yapılabilir)

1. OAuth `next` param sanitize (5 dk).
2. Sentry replay mask (10 dk).
3. Migration klasörü check dosyalarını taşı (15 dk).
4. `.env.example` yaz (15 dk).
5. Zod ile `createRetroSchema`, `createTeamSchema`, `updateProfileSchema` (1 sa).
6. Card content length limit (DB + UI) (30 dk).
7. Theme toggle (Tailwind + localStorage) (1 sa).
8. QR kod davet linki (`qrcode.react`) (30 dk).
9. Settings sayfasına avatar upload (Supabase Storage zaten var ise 1 sa).
