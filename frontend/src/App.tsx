import { useEffect, useMemo, useState } from 'react'
import { Coffee, Heart, Home, ShoppingBag, Shirt, Trophy, Zap } from 'lucide-react'

type Player = {
  telegram_id: number
  username?: string | null
  first_name?: string | null
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

type ActionResponse = {
  message: string
  player: Player
}

const APP_VERSION = '0.6.1-actions-debug'
const API_URL = (
  import.meta.env.VITE_API_URL || 'https://web-production-9b804.up.railway.app'
).replace(/\/$/, '')

const actions = [
  { id: 'hug', title: 'Обнять', reward: '+8 любовь', icon: Heart },
  { id: 'coffee', title: 'Кофе', reward: '+12 энергия', icon: Coffee },
  { id: 'talk', title: 'Поговорить', reward: '+10 настроение', icon: Zap },
]

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [message, setMessage] = useState('Я немного сонная. Сделаешь мне кофе?')
  const [diagnostic, setDiagnostic] = useState(`Версия ${APP_VERSION}`)

  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    webApp?.ready()
    webApp?.expand()
    webApp?.setHeaderColor('#0b0914')
    webApp?.setBackgroundColor('#0b0914')

    async function login() {
      const currentInitData = webApp?.initData || ''
      if (!currentInitData) {
        setError('Открой игру через кнопку Telegram-бота.')
        setLoading(false)
        return
      }

      try {
        setDiagnostic(`Вход через ${API_URL}`)
        const response = await fetch(`${API_URL}/api/v1/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init_data: currentInitData }),
          cache: 'no-store',
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.detail || `Ошибка авторизации: ${response.status}`)
        }

        const loadedPlayer: Player = await response.json()
        setPlayer(loadedPlayer)
        setDiagnostic(`Готово · ${APP_VERSION}`)
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Не удалось войти в игру')
      } finally {
        setLoading(false)
      }
    }

    void login()
  }, [])

  async function performAction(action: string) {
    if (busyAction) return

    const currentInitData = window.Telegram?.WebApp?.initData || ''
    if (!currentInitData) {
      setError('Telegram не передал данные авторизации. Закрой и снова открой игру.')
      return
    }

    setBusyAction(action)
    setError(null)
    setDiagnostic(`Нажато: ${action}…`)
    setMessage('Подожди секунду…')
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()

    try {
      const response = await fetch(`${API_URL}/api/v1/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: currentInitData, action }),
        cache: 'no-store',
      })

      setDiagnostic(`Ответ действия: ${response.status}`)

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail || `Ошибка действия: ${response.status}`)
      }

      const result: ActionResponse = await response.json()
      setPlayer(result.player)
      setMessage(result.message)
      setDiagnostic(`Сохранено · опыт ${result.player.experience}`)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch (reason) {
      const messageText = reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
      setError(messageText)
      setMessage('Что-то не получилось. Попробуй ещё раз.')
      setDiagnostic(`Ошибка: ${messageText}`)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setBusyAction(null)
    }
  }

  const stats = useMemo(() => {
    const marina = player?.marina
    return [
      { label: 'Любовь', value: marina?.love ?? 50, icon: Heart },
      { label: 'Настроение', value: marina?.mood ?? 80, icon: Zap },
      { label: 'Энергия', value: marina?.energy ?? 100, icon: Coffee },
    ]
  }, [player])

  if (loading) {
    return <main className="game-shell status-screen">Загружаем день Марины…</main>
  }

  if (!player) {
    return (
      <main className="game-shell status-screen">
        <h1>День Марины</h1>
        <p>{error || 'Не удалось загрузить игрока.'}</p>
        <small>{diagnostic}</small>
      </main>
    )
  }

  const marina = player.marina
  const playerName = player.first_name || 'Игрок'

  return (
    <main className="game-shell">
      <section className="hero-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">День {marina.day} · {marina.period === 'morning' ? 'Утро' : marina.period}</p>
            <h1>День Марины</h1>
            <small>Привет, {playerName} · Опыт {player.experience}</small>
          </div>
          <div className="currency">🪙 {player.coins.toLocaleString('ru-RU')}</div>
        </header>

        <div className="stats-grid">
          {stats.map(({ label, value, icon: Icon }) => (
            <article className="glass-card stat" key={label}>
              <Icon size={18} />
              <div>
                <span>{label}</span>
                <div className="meter"><i style={{ width: `${Math.min(100, value)}%` }} /></div>
              </div>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <div className="scene">
          <div className="ambient ambient-one" />
          <div className="ambient ambient-two" />
          <div className="character-placeholder">
            <div className="portrait-glow" />
            <span>М</span>
          </div>
          <div className="dialogue glass-card">
            <p>Марина ❤️</p>
            <span>{message}</span>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 10, marginTop: 12, fontSize: 12 }}>
          {diagnostic}
        </div>
        {error && <div className="glass-card" style={{ padding: 12, marginTop: 10 }}>{error}</div>}

        <section className="actions">
          {actions.map(({ id, title, reward, icon: Icon }) => (
            <button
              type="button"
              className="action-card"
              key={id}
              disabled={busyAction !== null}
              onClick={() => void performAction(id)}
            >
              <Icon size={22} />
              <span>{busyAction === id ? 'Подожди…' : title}</span>
              <small>{reward}</small>
            </button>
          ))}
        </section>
      </section>

      <nav className="bottom-nav">
        <button type="button" className="active"><Home size={20} /><span>Главная</span></button>
        <button type="button"><ShoppingBag size={20} /><span>Магазин</span></button>
        <button type="button"><Shirt size={20} /><span>Гардероб</span></button>
        <button type="button"><Trophy size={20} /><span>Награды</span></button>
      </nav>
    </main>
  )
}
