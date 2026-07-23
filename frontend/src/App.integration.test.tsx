// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const API_URL = 'https://web-production-9b804.up.railway.app'
const INIT_DATA = 'query_id=test&user=%7B%22id%22%3A42%7D&auth_date=1784678400&hash=test'

type MockPlayer = {
  telegram_id: number
  username: string
  first_name: string
  level: number
  experience: number
  coins: number
  crystals: number
  marina: {
    day: number
    period: string
    love: number
    mood: number
    energy: number
    hunger: number
    calm: number
    trust: number
    attachment: number
    romance: number
  }
}

function player(overrides: Partial<MockPlayer> = {}): MockPlayer {
  return {
    telegram_id: 42,
    username: 'tester',
    first_name: 'Tester',
    level: 3,
    experience: 120,
    coins: 75,
    crystals: 9,
    marina: {
      day: 4,
      period: 'morning',
      love: 66,
      mood: 77,
      energy: 88,
      hunger: 55,
      calm: 44,
      trust: 70,
      attachment: 40,
      romance: 30,
    },
    ...overrides,
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
}

function mockTelegram(initData = INIT_DATA) {
  const webApp = {
    initData,
    initDataUnsafe: { user: { id: 42, first_name: 'Tester', username: 'tester' } },
    colorScheme: 'dark' as const,
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    ready: vi.fn(),
    expand: vi.fn(),
    setHeaderColor: vi.fn(),
    setBackgroundColor: vi.fn(),
  }

  Object.defineProperty(window, 'Telegram', {
    configurable: true,
    writable: true,
    value: { WebApp: webApp },
  })

  return webApp
}

function mockUuid() {
  let nextId = 0
  vi.stubGlobal('crypto', { randomUUID: () => `integration-key-${++nextId}` })
}

function requestBody(call: unknown[]) {
  return JSON.parse((call[1] as RequestInit).body as string) as Record<string, string>
}

function expectExperience(value: number) {
  expect(screen.getByText((_, node) => node?.textContent === `1.3.1-happy-png · опыт ${value}`)).toBeInTheDocument()
}

describe('App Telegram integration flows', () => {
  beforeEach(() => {
    mockTelegram()
    mockUuid()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    Reflect.deleteProperty(window, 'Telegram')
  })

  it('authenticates with Telegram initData and renders the loaded player state', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(player()))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('День 4')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expectExperience(120)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_URL}/api/v1/auth/telegram`)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', cache: 'no-store' })
    expect(requestBody(fetchMock.mock.calls[0])).toEqual({ init_data: INIT_DATA })
  })

  it('shows the existing auth error state when Telegram auth fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ detail: 'bad telegram auth' }, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    expect(await screen.findByText('bad telegram auth')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'День Марины' })).toBeInTheDocument()
  })

  it('sends chat messages with initData and an idempotency key, then renders Marina reply', async () => {
    const loadedPlayer = player()
    const repliedPlayer = player({ experience: 125 })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(loadedPlayer))
      .mockResolvedValueOnce(jsonResponse({ reply: 'Я тоже рада тебя слышать ❤️', emotion: 'happy', player: repliedPlayer }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    await userEvent.click(screen.getByRole('button', { name: /Поговорить/i }))
    await userEvent.type(screen.getByPlaceholderText('Напиши Марине…'), 'Привет, Марина')
    fireEvent.submit(screen.getByPlaceholderText('Напиши Марине…').closest('form')!)

    expect(await screen.findAllByText('Я тоже рада тебя слышать ❤️')).toHaveLength(2)
    expectExperience(125)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/chat`)
    const body = requestBody(fetchMock.mock.calls[1])
    expect(body).toEqual({
      init_data: INIT_DATA,
      message: 'Привет, Марина',
      idempotency_key: 'integration-key-1',
    })
    expect(body.idempotency_key).not.toHaveLength(0)
  })

  it('sends an action with initData and idempotency key, then applies the updated player state', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player()))
      .mockResolvedValueOnce(jsonResponse({ message: 'Марина выпила кофе и улыбается.', player: player({ coins: 80, experience: 127 }) }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    await userEvent.click(screen.getByRole('button', { name: /Выпить кофе/i }))

    expect(await screen.findByText('Марина выпила кофе и улыбается.')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
    expectExperience(127)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/actions`)
    expect(requestBody(fetchMock.mock.calls[1])).toEqual({
      init_data: INIT_DATA,
      action: 'coffee',
      idempotency_key: 'integration-key-1',
    })
  })

  it('prevents parallel duplicate action requests while an action is pending', async () => {
    let resolveAction!: (response: Response) => void
    const pendingAction = new Promise<Response>((resolve) => { resolveAction = resolve })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player()))
      .mockReturnValueOnce(pendingAction)
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    const coffeeButton = screen.getByRole('button', { name: /Выпить кофе/i })
    await userEvent.click(coffeeButton)
    await waitFor(() => expect(coffeeButton).toBeDisabled())
    await userEvent.click(coffeeButton)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    resolveAction(jsonResponse({ message: 'Марина выпила кофе и улыбается.', player: player() }))
    await screen.findByText('Марина выпила кофе и улыбается.')
  })

  it('clears chat busy state and keeps the previous player state after a chat HTTP error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player({ experience: 120 })))
      .mockResolvedValueOnce(jsonResponse({ detail: 'chat unavailable' }, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await waitFor(() => expectExperience(120))

    await userEvent.click(screen.getByRole('button', { name: /Поговорить/i }))
    const input = screen.getByPlaceholderText('Напиши Марине…')
    await userEvent.type(input, 'Ты здесь?')
    const form = input.closest('form')!
    fireEvent.submit(form)

    expect(await screen.findByText('chat unavailable')).toBeInTheDocument()
    expect(screen.getByText('Что-то не получилось. Давай попробуем ещё раз.')).toBeInTheDocument()
    expectExperience(120)
    expect(within(form).getByRole('button')).toBeDisabled()

    await userEvent.type(input, 'Повторим')
    expect(within(form).getByRole('button')).not.toBeDisabled()
  })

  it('advances the day with initData and idempotency key, then updates period stats and message', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player()))
      .mockResolvedValueOnce(jsonResponse({
        message: 'Наступил день. Марина готова продолжать дела вместе с тобой.',
        player: player({ marina: { ...player().marina, period: 'day', energy: 80, hunger: 49, mood: 78, calm: 42 } }),
      }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    await userEvent.click(screen.getByRole('button', { name: /Продолжить день/i }))

    expect(await screen.findByText('Наступил день. Марина готова продолжать дела вместе с тобой.')).toBeInTheDocument()
    expect(screen.getByText('Добрый день')).toBeInTheDocument()
    expect(screen.getByText('13:00')).toBeInTheDocument()
    expect(screen.getByText('80/100')).toBeInTheDocument()
    expect(screen.getByText('49/100')).toBeInTheDocument()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_URL}/api/v1/day/advance`)
    expect(requestBody(fetchMock.mock.calls[1])).toEqual({
      init_data: INIT_DATA,
      idempotency_key: 'integration-key-1',
    })
  })

  it('prevents duplicate day advance requests while pending', async () => {
    let resolveAdvance!: (response: Response) => void
    const pendingAdvance = new Promise<Response>((resolve) => { resolveAdvance = resolve })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player()))
      .mockReturnValueOnce(pendingAdvance)
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    const advanceButton = screen.getByRole('button', { name: /Продолжить день/i })
    await userEvent.click(advanceButton)
    await waitFor(() => expect(advanceButton).toBeDisabled())
    await userEvent.click(advanceButton)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    resolveAdvance(jsonResponse({ message: 'Наступил день.', player: player({ marina: { ...player().marina, period: 'day' } }) }))
    expect(await screen.findByText('Наступил день.')).toBeInTheDocument()
  })

  it('recovers from day advance errors without applying a local period transition', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player()))
      .mockResolvedValueOnce(jsonResponse({ detail: 'day unavailable' }, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    const advanceButton = screen.getByRole('button', { name: /Продолжить день/i })
    await userEvent.click(advanceButton)

    expect(await screen.findByText('day unavailable')).toBeInTheDocument()
    expect(screen.getByText('Доброе утро')).toBeInTheDocument()
    expect(screen.getByText('08:00')).toBeInTheDocument()
    await waitFor(() => expect(advanceButton).not.toBeDisabled())
  })

})
