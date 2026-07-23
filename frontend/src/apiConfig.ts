export const DEFAULT_API_BASE_URL = 'https://web-production-9b804.up.railway.app'

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

export function normalizeApiBaseUrl(rawValue: string | undefined, fallback = DEFAULT_API_BASE_URL): string {
  const candidate = (rawValue?.trim() || fallback).trim()
  const parsed = new URL(candidate)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Unsupported API URL protocol: ${parsed.protocol}`)
  }
  return trimTrailingSlashes(`${parsed.origin}${parsed.pathname}`)
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL)

export function apiEndpoint(path: string, baseUrl = API_BASE_URL): string {
  const normalizedPath = path.replace(/^\/+/, '')
  return `${trimTrailingSlashes(baseUrl)}/${normalizedPath}`
}

export function safeUrlForDiagnostics(rawValue: string): string {
  const parsed = new URL(rawValue)
  return trimTrailingSlashes(`${parsed.origin}${parsed.pathname}`)
}
