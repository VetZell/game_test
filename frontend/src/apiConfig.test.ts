import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_API_BASE_URL, apiEndpoint, normalizeApiBaseUrl, safeUrlForDiagnostics } from './apiConfig'

describe('API configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('uses the production fallback backend URL when VITE_API_URL is absent', async () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.resetModules()

    const config = await import('./apiConfig')

    expect(config.API_BASE_URL).toBe(DEFAULT_API_BASE_URL)
    expect(config.apiEndpoint('/api/v1/actions')).toBe(`${DEFAULT_API_BASE_URL}/api/v1/actions`)
  })

  it('normalizes configured API URLs and endpoint paths without double slashes', () => {
    const base = normalizeApiBaseUrl(' https://api.example.com/// ')

    expect(base).toBe('https://api.example.com')
    expect(apiEndpoint('api/v1/actions', base)).toBe('https://api.example.com/api/v1/actions')
    expect(apiEndpoint('/api/v1/chat', base)).toBe('https://api.example.com/api/v1/chat')
    expect(apiEndpoint('///api/v1/day/advance', base)).toBe('https://api.example.com/api/v1/day/advance')
  })

  it('uses build-time VITE_API_URL when provided', async () => {
    vi.stubEnv('VITE_API_URL', 'https://backend.example.com/')
    vi.resetModules()

    const config = await import('./apiConfig')

    expect(config.API_BASE_URL).toBe('https://backend.example.com')
    expect(config.apiEndpoint('/api/v1/actions')).toBe('https://backend.example.com/api/v1/actions')
  })

  it('rejects unsupported protocols and strips query data from diagnostics', () => {
    expect(() => normalizeApiBaseUrl('ftp://api.example.com')).toThrow('Unsupported API URL protocol')
    expect(safeUrlForDiagnostics('https://api.example.com/api/v1/actions?secret=hidden')).toBe('https://api.example.com/api/v1/actions')
  })
})
