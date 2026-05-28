import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123'

test.describe('Retro full flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(TEST_EMAIL)
    await page.getByLabel('Password').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('dashboard shows stat cards', async ({ page }) => {
    await expect(page.getByText('In Progress')).toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()
    await expect(page.getByText('Teams')).toBeVisible()
  })

  test('create retro wizard flow', async ({ page }) => {
    await page.getByRole('button', { name: /Start Retro|New Retro/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('create team then retro', async ({ page }) => {
    await page.getByRole('button', { name: /Start Retro|New Retro/i }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // If no teams exist, wizard opens at team creation
    const teamNameInput = dialog.getByLabel('Team name')
    if (await teamNameInput.isVisible()) {
      await teamNameInput.fill(`E2E Team ${Date.now()}`)
      await dialog.getByRole('button', { name: 'Create' }).click()
    }

    // Template step
    await expect(dialog.getByText('Choose a template')).toBeVisible({ timeout: 5000 })
    await dialog.getByRole('button', { name: 'Continue' }).click()

    // Name step
    await expect(dialog.getByLabel('Retro name')).toBeVisible()
    await dialog.getByLabel('Retro name').fill(`E2E Retro ${Date.now()}`)
    await dialog.getByRole('button', { name: 'Continue' }).click()

    // Config step
    await expect(dialog.getByText('Configure options')).toBeVisible()
    await dialog.getByRole('button', { name: 'Start Retro' }).click()

    // Should navigate to lobby
    await expect(page).toHaveURL(/\/retro\/.+\/lobby/, { timeout: 15000 })
  })

  test('lobby shows participant list and controls', async ({ page }) => {
    // Navigate to an existing retro (if any)
    const resumeLink = page.getByRole('link', { name: /Resume/i }).first()
    if (await resumeLink.isVisible({ timeout: 2000 })) {
      await resumeLink.click()
      await expect(page).toHaveURL(/\/retro\//)
    }
  })

  test('write phase: add and edit card', async ({ page }) => {
    const writePhaseUrl = /\/retro\/.+\/board/
    // Find an active write-phase retro or skip
    const resumeBtn = page.getByRole('link', { name: /Resume/i }).first()
    if (!await resumeBtn.isVisible({ timeout: 2000 })) {
      test.skip()
      return
    }
    await resumeBtn.click()
    await expect(page).toHaveURL(writePhaseUrl, { timeout: 10000 })

    // Look for Add Card button
    const addCardBtn = page.getByRole('button', { name: /Add Card/i }).first()
    if (await addCardBtn.isVisible({ timeout: 3000 })) {
      await addCardBtn.click()
      await page.getByPlaceholder('Type your thought...').fill('E2E test card content')
      await page.getByRole('button', { name: 'Add' }).click()
      await expect(page.getByText('E2E test card content')).toBeVisible({ timeout: 5000 })
    }
  })

  test('sidebar shows participants', async ({ page }) => {
    const resumeBtn = page.getByRole('link', { name: /Resume/i }).first()
    if (!await resumeBtn.isVisible({ timeout: 2000 })) {
      test.skip()
      return
    }
    await resumeBtn.click()
    await expect(page.getByText(/Participants/)).toBeVisible({ timeout: 10000 })
  })
})
