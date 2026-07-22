type MutationFields = Record<string, string>

type MutationPayload<T extends MutationFields> = T & {
  idempotency_key: string
}

function fallbackIdempotencyKey(): string {
  const randomPart = Math.random().toString(36).slice(2)
  return `idem-${Date.now().toString(36)}-${randomPart}`
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return fallbackIdempotencyKey()
}

export function createMutationPayload<T extends MutationFields>(fields: T): MutationPayload<T> {
  return {
    ...fields,
    idempotency_key: createIdempotencyKey(),
  }
}
