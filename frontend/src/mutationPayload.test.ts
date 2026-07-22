import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIdempotencyKey, createMutationPayload } from './mutationPayload'

const BACKEND_MAX_IDEMPOTENCY_KEY_LENGTH = 128

describe('createIdempotencyKey', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-22T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('returns a non-empty backend-compatible string', () => {
    vi.stubGlobal('crypto', { randomUUID: () => '11111111-1111-4111-8111-111111111111' })

    const key = createIdempotencyKey()

    expect(key).toBe('11111111-1111-4111-8111-111111111111')
    expect(key.length).toBeGreaterThan(0)
    expect(key.length).toBeLessThanOrEqual(BACKEND_MAX_IDEMPOTENCY_KEY_LENGTH)
  })

  it('uses crypto.randomUUID when it is available', () => {
    const randomUUID = vi.fn(() => '22222222-2222-4222-8222-222222222222')
    vi.stubGlobal('crypto', { randomUUID })

    expect(createIdempotencyKey()).toBe('22222222-2222-4222-8222-222222222222')
    expect(randomUUID).toHaveBeenCalledOnce()
  })

  it('creates different keys for sequential mutation requests', () => {
    let nextId = 0
    vi.stubGlobal('crypto', { randomUUID: () => `mutation-key-${++nextId}` })

    const firstPayload = createMutationPayload({ init_data: 'telegram-init-data', action: 'talk' })
    const secondPayload = createMutationPayload({ init_data: 'telegram-init-data', action: 'talk' })

    expect(firstPayload.idempotency_key).toBe('mutation-key-1')
    expect(secondPayload.idempotency_key).toBe('mutation-key-2')
    expect(firstPayload.idempotency_key).not.toBe(secondPayload.idempotency_key)
  })

  it('uses fallback without user payload data when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {})
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)

    const payload = createMutationPayload({
      init_data: 'sensitive-telegram-init-data',
      message: 'private user message',
    })

    expect(payload.idempotency_key).toMatch(/^idem-[a-z0-9]+-[a-z0-9]+$/)
    expect(payload.idempotency_key.length).toBeLessThanOrEqual(BACKEND_MAX_IDEMPOTENCY_KEY_LENGTH)
    expect(payload.idempotency_key).not.toContain('sensitive-telegram-init-data')
    expect(payload.idempotency_key).not.toContain('private user message')
  })
})

describe('createMutationPayload', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('preserves chat fields and adds exactly one idempotency_key', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'chat-key' })

    const payload = createMutationPayload({ init_data: 'chat-init-data', message: 'hello' })

    expect(payload).toEqual({
      init_data: 'chat-init-data',
      message: 'hello',
      idempotency_key: 'chat-key',
    })
    expect(Object.keys(payload).filter((key) => key === 'idempotency_key')).toHaveLength(1)
  })

  it('preserves action fields and adds exactly one idempotency_key', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'action-key' })

    const payload = createMutationPayload({ init_data: 'action-init-data', action: 'gift' })

    expect(payload).toEqual({
      init_data: 'action-init-data',
      action: 'gift',
      idempotency_key: 'action-key',
    })
    expect(Object.keys(payload).filter((key) => key === 'idempotency_key')).toHaveLength(1)
  })

  it('keeps a reused payload key stable while new helper calls create new keys', () => {
    let nextId = 0
    vi.stubGlobal('crypto', { randomUUID: () => `stable-key-${++nextId}` })

    const reusedPayload = createMutationPayload({ init_data: 'init-data', message: 'hello' })
    const sameReference = reusedPayload
    const newPayload = createMutationPayload({ init_data: 'init-data', message: 'hello' })

    expect(sameReference.idempotency_key).toBe(reusedPayload.idempotency_key)
    expect(reusedPayload.idempotency_key).toBe('stable-key-1')
    expect(newPayload.idempotency_key).toBe('stable-key-2')
    expect(newPayload.idempotency_key).not.toBe(reusedPayload.idempotency_key)
  })
})
