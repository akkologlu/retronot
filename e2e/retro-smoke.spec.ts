import { existsSync } from 'node:fs'
import { test, expect, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Multi-user smoke test. Needs real test accounts in .env.e2e.local (see E2E_* below)
// and writes real data to the configured Supabase project, all prefixed "E2E Smoke".
for (const file of ['.env.local', '.env.e2e.local']) {
  if (existsSync(file)) process.loadEnvFile(file)
}

const env = process.env
const CREDENTIALS = {
  mod: { email: env.E2E_MOD_EMAIL ?? '', password: env.E2E_MOD_PASSWORD ?? '' },
  u2: { email: env.E2E_USER2_EMAIL ?? '', password: env.E2E_USER2_PASSWORD ?? '' },
  u3: { email: env.E2E_USER3_EMAIL ?? '', password: env.E2E_USER3_PASSWORD ?? '' },
}
type UserKey = keyof typeof CREDENTIALS

const RUN = Date.now()
const TEAM_NAME = `E2E Smoke Team ${RUN}`
const ITEMS = { done: `Smoke item done ${RUN}`, carry: `Smoke item carry ${RUN}`, drop: `Smoke item drop ${RUN}` }
const CARD_COUNT = 5
const STALE_READ_HOLD_MS = 1200

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const retroIdOf = (page: Page) => page.url().match(/\/retro\/([0-9a-f-]{36})/)![1]

const sidebar = (page: Page) => page.locator('div.w-64')
const sidebarTitle = (page: Page) => sidebar(page).locator('span.font-semibold')
const sidebarNames = (page: Page) => sidebar(page).locator('.group span.truncate.font-medium').allTextContents()

async function pressBack(page: Page) {
  await page.goBack({ timeout: 5000 }).catch(() => {})
  await sleep(600)
}

async function expectBackBlocked(page: Page, visibleAfter: ReturnType<Page['getByText']>) {
  const url = page.url()
  await pressBack(page)
  await pressBack(page)
  expect(page.url()).toBe(url)
  await expect(visibleAfter).toBeVisible()
}

async function login(context: BrowserContext, user: UserKey) {
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Email').fill(CREDENTIALS[user].email)
  await page.getByLabel('Password').fill(CREDENTIALS[user].password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 })
  return page
}

async function createRetro(page: Page, name: string) {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Start Retro' }).first().click()
  const dialog = page.getByRole('dialog')
  const title = dialog.getByRole('heading')
  await expect(title).toHaveText(/Select a team|Choose a template/)
  if ((await title.textContent())?.includes('Select a team')) {
    await dialog.getByRole('button', { name: new RegExp(TEAM_NAME) }).click()
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
  }
  await expect(title).toHaveText('Choose a template')
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
  await dialog.getByLabel('Retro name').fill(name)
  await dialog.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(title).toHaveText('Configure options')
  await dialog.getByRole('button', { name: 'Start Retro' }).click()
  await expect(page).toHaveURL(/\/retro\/.+\/lobby/, { timeout: 20000 })
}

async function joinRetro(page: Page, retroId: string) {
  await page.goto(`/retro/${retroId}`)
  const join = page.getByRole('button', { name: 'Join Team & Retro' })
  if (await join.isVisible()) await join.click()
  await expect(page).toHaveURL(/\/retro\/.+\/(lobby|board)/, { timeout: 20000 })
}

// Replays a server action as this user, bypassing the UI, and returns the raw response.
async function replayAction(page: Page, actionId: string, args: unknown[]) {
  return page.evaluate(
    async ({ actionId, args }) => {
      const res = await fetch(location.href, {
        method: 'POST',
        headers: { 'Next-Action': actionId, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(args),
      })
      return res.text()
    },
    { actionId, args },
  )
}

async function captureActionId(page: Page, trigger: () => Promise<void>) {
  const request = page.waitForRequest(r => r.method() === 'POST' && !!r.headers()['next-action'])
  await trigger()
  return (await request).headers()['next-action']
}

// Every retros read this page makes gets the server's answer immediately, but is only
// delivered later. A click made in between reproduces a stale poll landing mid-transition.
async function holdRetroReads(page: Page, holdMs: number) {
  let onRead: (() => void) | null = null
  const handler = async (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    const response = await route.fetch()
    onRead?.()
    onRead = null
    await sleep(holdMs)
    await route.fulfill({ response }).catch(() => {})
  }
  await page.route('**/rest/v1/retros?*', handler)
  return {
    nextRead: () => new Promise<void>(resolve => { onRead = resolve }),
    release: () => page.unroute('**/rest/v1/retros?*', handler),
  }
}

// Records each change of the "topic : card" shown, including frames during transitions.
async function recordTopics(page: Page) {
  await page.evaluate(() => {
    const read = () => {
      const topic = document.body.textContent?.match(/Topic (\d+) of/)?.[1] ?? '?'
      const card = document.querySelector('p.text-2xl')?.textContent ?? '?'
      return `${topic}:${card}`
    }
    const w = window as unknown as { __topics: string[] }
    w.__topics = [read()]
    new MutationObserver(() => {
      const value = read()
      if (w.__topics[w.__topics.length - 1] !== value) w.__topics.push(value)
    }).observe(document.body, { subtree: true, childList: true, characterData: true })
  })
}

const readTopics = (page: Page) => page.evaluate(() => (window as unknown as { __topics: string[] }).__topics)
const topicOf = (entry: string) => Number(entry.split(':')[0])

test.describe.serial('Retro smoke (3 users)', () => {
  test.skip(!CREDENTIALS.mod.email || !CREDENTIALS.u2.email || !CREDENTIALS.u3.email, 'E2E_* credentials not set')
  test.setTimeout(180_000)
  test.use({ actionTimeout: 20_000 })

  const contexts: BrowserContext[] = []
  const pages = {} as Record<UserKey, Page>
  const clients = {} as Record<UserKey, SupabaseClient>
  const userIds = {} as Record<UserKey, string>
  const pageErrors: string[] = []
  const trackErrors = (page: Page, user: string) => page.on('pageerror', e => pageErrors.push(`${user}: ${e.message}`))
  let retroA = ''
  let retroB = ''
  let advanceActionId = ''

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    for (const user of Object.keys(CREDENTIALS) as UserKey[]) {
      const context = await browser.newContext()
      contexts.push(context)
      pages[user] = await login(context, user)
      trackErrors(pages[user], user)

      clients[user] = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { data, error } = await clients[user].auth.signInWithPassword(CREDENTIALS[user])
      if (error) throw error
      userIds[user] = data.user.id
    }

    const { data: team, error } = await clients.mod
      .from('teams')
      .insert({ name: TEAM_NAME, owner_id: userIds.mod })
      .select()
      .single()
    if (error) throw error
    const { error: memberError } = await clients.mod
      .from('team_members')
      .insert({ team_id: team.id, user_id: userIds.mod, role: 'owner' })
    if (memberError) throw memberError
  })

  test.afterAll(async () => {
    await Promise.all(contexts.map(context => context.close()))
  })

  test('participants who join at the same time see the same list', async () => {
    await createRetro(pages.mod, `E2E Smoke Retro A ${RUN}`)
    retroA = retroIdOf(pages.mod)
    await Promise.all([joinRetro(pages.u2, retroA), joinRetro(pages.u3, retroA)])

    for (const page of Object.values(pages)) {
      await expect(sidebarTitle(page)).toHaveText('Participants (3)', { timeout: 15000 })
    }
    const lists = await Promise.all(Object.values(pages).map(sidebarNames))
    console.warn('[smoke] sidebar names:', lists[0])
    expect(lists[1]).toEqual(lists[0])
    expect(lists[2]).toEqual(lists[0])
  })

  test('first retro of a team skips review, and Back is blocked in every active phase', async () => {
    advanceActionId = await captureActionId(pages.mod, () =>
      pages.mod.getByRole('button', { name: 'Start Retro' }).click(),
    )
    for (const page of Object.values(pages)) {
      await expect(page.getByRole('heading', { name: 'Write Phase' })).toBeVisible({ timeout: 20000 })
      await expect(page).toHaveURL(/\/board/)
    }

    // A half-typed card proves Back does not remount the page.
    await pages.mod.getByRole('button', { name: 'Add Card' }).first().click()
    const draft = pages.mod.getByPlaceholder('Type your thought...')
    await draft.fill('draft survives back')
    await expectBackBlocked(pages.mod, pages.mod.getByRole('heading', { name: 'Write Phase' }))
    await expectBackBlocked(pages.u2, pages.u2.getByRole('heading', { name: 'Write Phase' }))
    await expect(draft).toHaveValue('draft survives back')

    for (let i = 1; i <= CARD_COUNT; i++) {
      // The composer closes after each card.
      if (i > 1) await pages.mod.getByRole('button', { name: 'Add Card' }).first().click()
      await draft.fill(`Smoke card ${i} ${RUN}`)
      await draft.press('Enter')
      await expect(pages.mod.getByText(`Smoke card ${i} ${RUN}`)).toBeVisible()
    }

    await pages.mod.getByRole('button', { name: 'Next Phase' }).click()
    await expect(pages.mod.getByRole('heading', { name: 'Grouping Phase' })).toBeVisible({ timeout: 20000 })
    await expectBackBlocked(pages.mod, pages.mod.getByRole('heading', { name: 'Grouping Phase' }))

    await pages.mod.getByRole('button', { name: 'Next Phase' }).click()
    await expect(pages.mod.getByRole('heading', { name: 'Voting Phase' })).toBeVisible({ timeout: 20000 })
    await expectBackBlocked(pages.mod, pages.mod.getByRole('heading', { name: 'Voting Phase' }))

    await pages.mod.getByRole('button', { name: 'Next Phase' }).click()
    for (const page of Object.values(pages)) {
      await expect(page.getByRole('heading', { name: 'Discussion Phase' })).toBeVisible({ timeout: 20000 })
    }
    await expect(pages.mod.getByText(`Topic 1 of ${CARD_COUNT}`)).toBeVisible()
    await expectBackBlocked(pages.mod, pages.mod.getByText(`Topic 1 of ${CARD_COUNT}`))
  })

  test('only the moderator can add and delete action items', async () => {
    const input = pages.mod.getByPlaceholder('Add an action item...')
    const add = async (page: Page, content: string) => {
      await page.getByPlaceholder('Add an action item...').fill(content)
      await page.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(page.getByText(content)).toBeVisible()
    }
    await expect(input).toBeVisible()
    await add(pages.mod, ITEMS.done)
    await add(pages.mod, ITEMS.carry)
    await add(pages.mod, ITEMS.drop)
    const toDelete = `Smoke item delete ${RUN}`
    await add(pages.mod, toDelete)

    // Non-moderators see the items read-only.
    for (const page of [pages.u2, pages.u3]) {
      await expect(page.getByText(toDelete)).toBeVisible({ timeout: 10000 })
      await expect(page.getByPlaceholder('Add an action item...')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Delete action item' })).toHaveCount(0)
    }

    // Going around the UI must fail at the database too.
    const { data: rows } = await clients.mod.from('action_items').select('id, content').eq('retro_id', retroA)
    const target = rows!.find(r => r.content === toDelete)!
    const forged = await clients.u2.from('action_items').insert({ retro_id: retroA, content: 'forged' }).select()
    expect(forged.error?.code).toBe('42501')
    const forgedDelete = await clients.u2.from('action_items').delete().eq('id', target.id).select()
    expect(forgedDelete.data ?? []).toHaveLength(0)
    const stillThere = await clients.mod.from('action_items').select('id').eq('id', target.id)
    expect(stillThere.data).toHaveLength(1)

    await pages.mod
      .locator('div.bg-muted\\/50', { hasText: toDelete })
      .getByRole('button', { name: 'Delete action item' })
      .click()
    await expect(pages.mod.getByText(toDelete)).toHaveCount(0)
    await expect(pages.u2.getByText(toDelete)).toHaveCount(0, { timeout: 10000 })
    const gone = await clients.mod.from('action_items').select('id').eq('id', target.id)
    expect(gone.data).toHaveLength(0)

    // Permissions follow a moderator transfer, in both the UI and the database.
    const { data: order } = await clients.mod
      .from('retro_participants')
      .select('id, user_id, joined_at')
      .eq('retro_id', retroA)
      .order('joined_at')
    const transferTo = async (from: Page, to: UserKey) => {
      const row = sidebar(from).locator('.group').nth(order!.findIndex(p => p.user_id === userIds[to]))
      await row.hover()
      await row.getByRole('button', { name: /moderator$/ }).click()
    }
    await transferTo(pages.mod, 'u2')
    await expect(pages.u2.getByPlaceholder('Add an action item...')).toBeVisible({ timeout: 10000 })
    await expect(pages.mod.getByPlaceholder('Add an action item...')).toHaveCount(0, { timeout: 10000 })

    const allowed = await clients.u2.from('action_items').insert({ retro_id: retroA, content: 'allowed' }).select().single()
    expect(allowed.error).toBeNull()
    const allowedDelete = await clients.u2.from('action_items').delete().eq('id', allowed.data.id).select()
    expect(allowedDelete.data).toHaveLength(1)
    const oldMod = await clients.mod.from('action_items').insert({ retro_id: retroA, content: 'forged' }).select()
    expect(oldMod.error?.code).toBe('42501')

    await transferTo(pages.u2, 'mod')
    await expect(input).toBeVisible({ timeout: 10000 })
    await expect(pages.mod.getByRole('button', { name: 'Next', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('moving between discussion cards never shows the old card again', async () => {
    const everyone = Object.values(pages)
    await Promise.all(everyone.map(recordTopics))
    const holds = {
      mod: await holdRetroReads(pages.mod, STALE_READ_HOLD_MS),
      u2: await holdRetroReads(pages.u2, STALE_READ_HOLD_MS),
      u3: await holdRetroReads(pages.u3, STALE_READ_HOLD_MS),
    }
    const next = pages.mod.getByRole('button', { name: 'Next', exact: true })
    const waitForTopic = async (n: number) => {
      for (const page of everyone) {
        await expect(page.getByText(`Topic ${n} of ${CARD_COUNT}`)).toBeVisible({ timeout: 10000 })
      }
    }

    // Stale read in flight on the moderator's page.
    await holds.mod.nextRead()
    await next.click()
    await waitForTopic(2)
    await sleep(STALE_READ_HOLD_MS + 800)

    // Stale read in flight on a participant's page.
    await holds.u2.nextRead()
    await next.click()
    await waitForTopic(3)
    await sleep(STALE_READ_HOLD_MS + 800)

    // Rapid moves: late realtime echoes of the earlier move land on the newer card.
    await next.click()
    await expect(pages.mod.getByText(`Topic 4 of ${CARD_COUNT}`)).toBeVisible()
    await expect(next).toBeEnabled()
    await next.click()
    await waitForTopic(5)
    await sleep(STALE_READ_HOLD_MS + 800)

    const expected = [1, 2, 3, 4, 5]
    for (const [i, page] of everyone.entries()) {
      const seen = await readTopics(page)
      console.warn(`[smoke] discussion timeline #${i}:`, seen.map(topicOf).join(' -> '))
      const topics = seen.map(topicOf)
      // Participants may skip a frame on rapid moves; nobody may ever go backwards.
      expect(topics.every((t, j) => j === 0 || t > topics[j - 1]), `went backwards: ${topics}`).toBe(true)
      expect(topics[topics.length - 1]).toBe(5)
      if (page === pages.mod) expect(topics).toEqual(expected)

      // A topic number must never be shown together with a different topic's card.
      const cardByTopic = new Map<number, string>()
      for (const entry of seen) {
        const card = entry.slice(entry.indexOf(':') + 1)
        const known = cardByTopic.get(topicOf(entry))
        if (known) expect(card, `topic ${topicOf(entry)} showed two cards`).toBe(known)
        cardByTopic.set(topicOf(entry), card)
      }
    }

    // Diagnostic only: a read held past the 3s guard shows what the recorder would catch.
    if (env.SMOKE_SENSITIVITY) {
      await holds.mod.release()
      const longHold = await holdRetroReads(pages.mod, 4500)
      await longHold.nextRead()
      await pages.mod.getByRole('button', { name: 'Previous' }).click()
      await sleep(4500 + 500)
      const seen = (await readTopics(pages.mod)).map(topicOf)
      console.warn('[smoke] sensitivity (read held past the guard):', seen.join(' -> '))
      await longHold.release()
      await expect(pages.mod.getByText(`Topic 4 of ${CARD_COUNT}`)).toBeVisible({ timeout: 12000 })
      await holds.u2.release()
      await holds.u3.release()
    } else {
      await holds.mod.release()
      await holds.u2.release()
      await holds.u3.release()
    }
  })

  test('finishing moves everyone to the summary, where Back works again', async () => {
    const next = pages.mod.getByRole('button', { name: 'Next', exact: true })
    while (await next.isVisible()) {
      await expect(next).toBeEnabled()
      await next.click()
      await sleep(300)
    }
    await pages.mod.getByRole('button', { name: 'Finish' }).click()
    for (const page of Object.values(pages)) {
      await expect(page).toHaveURL(/\/summary/, { timeout: 20000 })
    }

    const left = async () => {
      for (let i = 0; i < 3 && pages.mod.url().includes(retroA); i++) await pressBack(pages.mod)
      return !pages.mod.url().includes(retroA)
    }
    expect(await left(), 'Back should leave a finished retro').toBe(true)
  })

  test('participant list converges through polling alone', async () => {
    await createRetro(pages.mod, `E2E Smoke Retro B ${RUN}`)
    retroB = retroIdOf(pages.mod)

    // Back is not blocked in the lobby.
    await pressBack(pages.mod)
    await expect(pages.mod).toHaveURL(/\/dashboard/)
    await pages.mod.goForward()
    await expect(pages.mod).toHaveURL(/\/lobby/)

    // No realtime at all for this client: only the poll can reveal who joins next.
    const offlinePage = await contexts[1].newPage()
    trackErrors(offlinePage, 'u2-no-realtime')
    await offlinePage.routeWebSocket(/realtime/, ws => ws.close())
    await joinRetro(offlinePage, retroB)
    await expect(sidebarTitle(offlinePage)).toHaveText('Participants (2)', { timeout: 15000 })

    await joinRetro(pages.u3, retroB)
    await expect(sidebarTitle(offlinePage)).toHaveText('Participants (3)', { timeout: 12000 })
    await offlinePage.close()

    await joinRetro(pages.u2, retroB)
    for (const page of Object.values(pages)) {
      await expect(sidebarTitle(page)).toHaveText('Participants (3)', { timeout: 15000 })
    }
    const lists = await Promise.all(Object.values(pages).map(sidebarNames))
    expect(lists[1]).toEqual(lists[0])
    expect(lists[2]).toEqual(lists[0])
    // Presence decides online status once everyone is connected.
    await expect(sidebar(pages.mod).getByText('Online', { exact: true })).toHaveCount(3, { timeout: 15000 })
  })

  test('open action items become a review phase that gates the retro', async () => {
    await expect(pages.mod.getByRole('button', { name: 'Start Retro' })).toBeVisible({ timeout: 15000 })
    await pages.mod.getByRole('button', { name: 'Start Retro' }).click()

    const reviewHint = (page: Page) => page.getByText('Review what the team committed to')
    const rowOf = (page: Page, item: string) => page.locator('div.rounded-md.border', { hasText: item })
    const resolvedRow = (page: Page, status: string) => page.getByText(`· ${status}`)
    const everyone = Object.values(pages)

    for (const page of everyone) {
      await expect(reviewHint(page)).toBeVisible({ timeout: 20000 })
      await expect(page).toHaveURL(/\/board/)
      for (const item of Object.values(ITEMS)) await expect(rowOf(page, item)).toBeVisible()
    }

    await expectBackBlocked(pages.mod, reviewHint(pages.mod))
    await expectBackBlocked(pages.u2, reviewHint(pages.u2))

    // Participants only watch.
    for (const page of [pages.u2, pages.u3]) {
      await expect(page.getByRole('button', { name: 'Done' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Continue to Writing' })).toHaveCount(0)
      await expect(page.getByText('Waiting for moderator to review')).toBeVisible()
    }

    const proceed = pages.mod.getByRole('button', { name: 'Continue to Writing' })
    await expect(proceed).toBeDisabled()
    await expect(pages.mod.getByText('0 of 3 reviewed')).toBeVisible()

    // The server enforces the same rules when the UI is bypassed.
    expect(await replayAction(pages.mod, advanceActionId, [retroB])).toContain('Review all action items')
    expect(await replayAction(pages.u2, advanceActionId, [retroB])).toContain('Not authorized')

    const { data: previous } = await clients.mod.from('action_items').select('id, content, completed').eq('retro_id', retroA)
    const idOf = (content: string) => previous!.find(i => i.content === content)!.id

    const resolveActionId = await captureActionId(pages.mod, () =>
      rowOf(pages.mod, ITEMS.done).getByRole('button', { name: 'Done', exact: true }).click(),
    )
    for (const page of everyone) await expect(resolvedRow(page, 'done')).toBeVisible({ timeout: 10000 })

    expect(await replayAction(pages.u2, resolveActionId, [retroB, idOf(ITEMS.carry), 'done'])).toContain('Not authorized')
    expect(await replayAction(pages.mod, resolveActionId, [retroB, idOf(ITEMS.done), 'carried'])).toContain('already reviewed')

    // Decisions survive a reload.
    await pages.u3.reload()
    await expect(resolvedRow(pages.u3, 'done')).toBeVisible({ timeout: 15000 })

    await expect(proceed).toBeDisabled()
    await rowOf(pages.mod, ITEMS.carry).getByRole('button', { name: 'Carry', exact: true }).click()
    for (const page of everyone) await expect(resolvedRow(page, 'carried')).toBeVisible({ timeout: 10000 })
    await expect(proceed).toBeDisabled()

    await rowOf(pages.mod, ITEMS.drop).getByRole('button', { name: /^Drop/ }).click()
    for (const page of everyone) await expect(resolvedRow(page, 'dropped')).toBeVisible({ timeout: 10000 })

    await expect(pages.mod.getByText('3 of 3 reviewed')).toBeVisible()
    await expect(proceed).toBeEnabled()

    const { data: after } = await clients.mod.from('action_items').select('content, completed').eq('retro_id', retroA)
    const completed = (content: string) => after!.find(i => i.content === content)!.completed
    expect(completed(ITEMS.done)).toBe(true)
    expect(completed(ITEMS.carry)).toBe(false)
    expect(completed(ITEMS.drop)).toBe(false)

    const { data: carried } = await clients.mod.from('action_items').select('content, carried_over_from').eq('retro_id', retroB)
    expect(carried).toEqual([{ content: ITEMS.carry, carried_over_from: idOf(ITEMS.carry) }])

    await proceed.click()
    for (const page of everyone) {
      await expect(page.getByRole('heading', { name: 'Write Phase' })).toBeVisible({ timeout: 20000 })
    }
  })

  test('no uncaught page errors during the session', async () => {
    expect(pageErrors).toEqual([])
  })
})
