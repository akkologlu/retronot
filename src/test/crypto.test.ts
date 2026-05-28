import { describe, it, expect } from 'vitest'
import { randomBytes } from 'crypto'
import { INVITE_TOKEN_BYTES } from '@/lib/constants'

describe('invite token generation', () => {
  it('produces correct length hex string', () => {
    const token = randomBytes(INVITE_TOKEN_BYTES).toString('hex')
    expect(token).toHaveLength(INVITE_TOKEN_BYTES * 2)
  })

  it('produces only hex characters', () => {
    const token = randomBytes(INVITE_TOKEN_BYTES).toString('hex')
    expect(token).toMatch(/^[0-9a-f]+$/)
  })

  it('produces unique tokens', () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => randomBytes(INVITE_TOKEN_BYTES).toString('hex'))
    )
    expect(tokens.size).toBe(100)
  })
})
