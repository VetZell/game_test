// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_API_BASE_URL } from './apiConfig'
import App from './App'

const API_URL = DEFAULT_API_BASE_URL
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


  it('renders a compact top HUD with day, period, advance control and all key stats', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(player()))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    const hud = screen.getByLabelText('Статус дня и характеристики')
    expect(hud).toHaveClass('compact-hud')
    expect(hud).toContainElement(screen.getByText('08:00'))
    expect(hud).toContainElement(screen.getByText('День 4'))
    expect(hud).toContainElement(screen.getByText('Доброе утро'))
    expect(screen.getByRole('button', { name: /Продолжить день/i })).toHaveClass('compact-advance-button')

    const statsRegion = screen.getByLabelText('Характеристики Марины')
    const stats = within(statsRegion)
    for (const label of ['Любовь', 'Настроение', 'Энергия', 'Сытость', 'Спокойствие']) {
      expect(stats.getByRole('article', { name: new RegExp(`${label}: \\d+ из 100`) })).toBeInTheDocument()
    }

    const statLabels = Array.from(hud.querySelectorAll('.compact-mini-stat')).map((node) => node.getAttribute('aria-label')?.split(':')[0])
    expect(statLabels).toEqual(['Любовь', 'Настроение', 'Энергия', 'Сытость', 'Спокойствие'])
    expect(Array.from(statsRegion.querySelectorAll('.compact-mini-stat span')).map((node) => node.textContent)).toEqual(['Люб', 'Настр', 'Эн', 'Сыт', 'Спок'])
    expect(hud.querySelector('.compact-time-card')).toBeInTheDocument()
    expect(hud.querySelector('.compact-stats-row')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(document.querySelectorAll('.compact-mini-stat')).toHaveLength(5)
    expect(document.querySelectorAll('.compact-meter')).toHaveLength(5)
  })


  it('keeps scene bottom controls and the talk button in a dedicated scene control group', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(player()))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    const controls = screen.getByLabelText('Фокус и разговор')
    expect(controls).toHaveClass('scene-bottom-controls')
    expect(controls).toContainElement(screen.getByText('Фокус сейчас').closest('aside'))
    expect(controls).toContainElement(screen.getByRole('button', { name: /Поговорить/i }))
    expect(screen.getByRole('navigation', { name: 'Основная навигация' })).toContainElement(screen.getByRole('button', { name: /Главная/i }))
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


  it('maps backend love emotion to synchronized label and visual, and falls back for unknown emotion', async () => {
    const lovingPlayer = player({ marina: { ...player().marina, love: 90, mood: 85 } })
    const unknownEmotionPlayer = player({ marina: { ...player().marina, love: 20, mood: 25 } })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player()))
      .mockResolvedValueOnce(jsonResponse({ reply: 'Люблю быть рядом.', emotion: 'love', player: lovingPlayer }))
      .mockResolvedValueOnce(jsonResponse({ reply: 'Неизвестное настроение.', emotion: 'mystery', player: unknownEmotionPlayer }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')
    await userEvent.click(screen.getByRole('button', { name: /Поговорить/i }))

    const input = screen.getByPlaceholderText('Напиши Марине…')
    await userEvent.type(input, 'Люблю')
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findAllByText('Люблю быть рядом.')).toHaveLength(2)
    expect(screen.getAllByText('Влюблена').length).toBeGreaterThan(0)
    expect(screen.getByAltText('Марина: Влюблена')).toHaveAttribute('src', '/marina/v2/happy.webp')

    await userEvent.type(input, 'Что дальше?')
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findAllByText('Неизвестное настроение.')).toHaveLength(2)
    expect(screen.getAllByText('Грустит').length).toBeGreaterThan(0)
    expect(screen.getByAltText('Марина: Грустит')).toHaveAttribute('src', '/marina/v2/sad.webp')
  })

  it('keeps inactive nav items non-interactive and exposes busy/accessibility attributes', async () => {
    let resolveAdvance!: (response: Response) => void
    const pendingAdvance = new Promise<Response>((resolve) => { resolveAdvance = resolve })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player()))
      .mockReturnValueOnce(pendingAdvance)
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findByText('День 4')

    expect(screen.queryByRole('button', { name: /Магазин/i })).not.toBeInTheDocument()
    expect(screen.getByText('Скоро: магазин')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Главная/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: /Поговорить/i })).toBeInTheDocument()

    const advanceButton = screen.getByRole('button', { name: /Продолжить день/i })
    expect(advanceButton).toHaveAttribute('aria-busy', 'false')
    await userEvent.click(advanceButton)
    await waitFor(() => expect(advanceButton).toHaveAttribute('aria-busy', 'true'))
    await waitFor(() => expect(screen.getByRole('button', { name: /Выпить кофе/i })).toBeDisabled())

    resolveAdvance(jsonResponse({ message: 'Наступил день.', player: player({ marina: { ...player().marina, period: 'day' } }) }))
    await screen.findByText('Наступил день.')
  })


  it('shows friendly action network errors instead of raw Load failed and preserves state', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player({ experience: 120 })))
      .mockRejectedValueOnce(new TypeError('Load failed'))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await waitFor(() => expectExperience(120))

    const coffeeButton = screen.getByRole('button', { name: /Выпить кофе/i })
    await userEvent.click(coffeeButton)

    expect(await screen.findByText('Не удалось подключиться к серверу.')).toBeInTheDocument()
    expect(screen.queryByText('Load failed')).not.toBeInTheDocument()
    expectExperience(120)
    await waitFor(() => expect(coffeeButton).not.toBeDisabled())
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalledWith('Action request failed', expect.objectContaining({
      frontendOrigin: 'http://localhost:3000',
      apiBaseUrl: API_URL,
      endpoint: `${API_URL}/api/v1/actions`,
      method: 'POST',
      category: 'network',
      errorName: 'TypeError',
    }))
  })

  it('maps action HTTP auth and server errors to friendly messages', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player({ experience: 120 })))
      .mockResolvedValueOnce(jsonResponse({ detail: 'raw auth detail' }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ detail: '<html>server down</html>' }, { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await waitFor(() => expectExperience(120))

    const coffeeButton = screen.getByRole('button', { name: /Выпить кофе/i })
    await userEvent.click(coffeeButton)
    expect(await screen.findByText('Не удалось подтвердить авторизацию Telegram.')).toBeInTheDocument()
    expect(screen.queryByText('raw auth detail')).not.toBeInTheDocument()
    await waitFor(() => expect(coffeeButton).not.toBeDisabled())

    await userEvent.click(coffeeButton)
    expect(await screen.findByText('Сервер временно недоступен. Попробуйте ещё раз.')).toBeInTheDocument()
    expect(screen.queryByText('<html>server down</html>')).not.toBeInTheDocument()
    expectExperience(120)
    expect(consoleSpy).toHaveBeenCalledWith('Action request failed', expect.objectContaining({ category: 'http', status: 401 }))
    expect(consoleSpy).toHaveBeenCalledWith('Action request failed', expect.objectContaining({ category: 'http', status: 503 }))
  })

  it('retries the last failed action with a new idempotency key and applies success once', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player({ coins: 75, experience: 120 })))
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce(jsonResponse({
        message: 'Спасибо! Такой кофе — идеальное начало утра ☕',
        player: player({ coins: 60, experience: 124, marina: { ...player().marina, energy: 98, mood: 82 } }),
      }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await waitFor(() => expectExperience(120))

    await userEvent.click(screen.getByRole('button', { name: /Выпить кофе/i }))
    expect(await screen.findByText('Не удалось подключиться к серверу.')).toBeInTheDocument()
    const retryButton = screen.getByRole('button', { name: 'Повторить' })
    await userEvent.click(retryButton)

    expect(await screen.findByText('Спасибо! Такой кофе — идеальное начало утра ☕')).toBeInTheDocument()
    expectExperience(124)
    expect(screen.getByText('60')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requestBody(fetchMock.mock.calls[1]).idempotency_key).toBe('integration-key-1')
    expect(requestBody(fetchMock.mock.calls[2]).idempotency_key).toBe('integration-key-2')
    expect(fetchMock.mock.calls[2][0]).toBe(`${API_URL}/api/v1/actions`)
    expect(requestBody(fetchMock.mock.calls[2]).action).toBe('coffee')
    expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalledTimes(1)
  })

  it('maps action conflict and validation errors without false local success', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(player({ experience: 120 })))
      .mockResolvedValueOnce(jsonResponse({ detail: 'conflict detail' }, { status: 409 }))
      .mockResolvedValueOnce(jsonResponse({ detail: 'validation detail' }, { status: 422 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await waitFor(() => expectExperience(120))

    const coffeeButton = screen.getByRole('button', { name: /Выпить кофе/i })
    await userEvent.click(coffeeButton)
    expect(await screen.findByText('Запрос уже обрабатывался. Повторите действие ещё раз.')).toBeInTheDocument()
    expectExperience(120)
    await waitFor(() => expect(coffeeButton).not.toBeDisabled())

    await userEvent.click(coffeeButton)
    expect(await screen.findByText('Действие сейчас выполнить нельзя.')).toBeInTheDocument()
    expect(screen.queryByText('validation detail')).not.toBeInTheDocument()
    expectExperience(120)
    expect(consoleSpy).toHaveBeenCalledWith('Action request failed', expect.objectContaining({ category: 'http', status: 409 }))
    expect(consoleSpy).toHaveBeenCalledWith('Action request failed', expect.objectContaining({ category: 'http', status: 422 }))
  })

})
