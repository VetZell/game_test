import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardList,
  Coffee,
  Film,
  Footprints,
  Gem,
  Gift,
  Heart,
  Home,
  Mail,
  ShoppingBag,
  Shirt,
  ShieldCheck,
  Smile,
  Sofa,
  Sun,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react'

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

type ActionResponse = { message: string; player: Player }

const APP_VERSION = '0.7.0-main-ui'
const API_URL = (import.meta.env.VITE_API_URL || 'https://web-production-9b804.up.railway.app').replace(/\/$/, '')

const actions = [
  { id: 'coffee', title: 'Кофе', reward: '+10 энергия · +5 настроение', icon: Coffee, tone: 'coffee' },
  { id: 'breakfast', title: 'Завтрак', reward: '+15 сытость · +5 любовь', icon: Utensils, tone: 'breakfast' },
  { id: 'kind_words', title: 'Добрые слова', reward: '+10 любовь · +10 настроение', icon: Mail, tone: 'words' },
  { id: 'walk', title: 'Прогулка', reward: '+15 энергия · +5 спокойствие', icon: Footprints, tone: 'walk' },
  { id: 'movie', title: 'Фильм', reward: '+10 настроение · +5 спокойствие', icon: Film, tone: 'movie' },
]

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [message, setMessage] = useState('Доброе утро! ☀️ Как ты спал?')

  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    webApp?.ready()
    webApp?.expand()
    webApp?.setHeaderColor('#090711')
    webApp?.setBackgroundColor('#090711')

    async function login() {
      const initData = webApp?.initData || ''
      if (!initData) {
        setError('Открой игру через кнопку Telegram-бота.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/v1/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init_data: initData }),
          cache: 'no-store',
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.detail || `Ошибка авторизации: ${response.status}`)
        }
        setPlayer(await response.json())
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
    const initData = window.Telegram?.WebApp?.initData || ''
    if (!initData) return

    setBusyAction(action)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, action }),
        cache: 'no-store',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail || `Ошибка действия: ${response.status}`)
      }
      const result: ActionResponse = await response.json()
      setPlayer(result.player)
      setMessage(result.message)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось выполнить действие')
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setBusyAction(null)
    }
  }

  const stats = useMemo(() => {
    const marina = player?.marina
    return [
      { label: 'Любовь', value: marina?.love ?? 50, icon: Heart, className: 'pink' },
      { label: 'Настроение', value: marina?.mood ?? 80, icon: Smile, className: 'orange' },
      { label: 'Энергия', value: marina?.energy ?? 100, icon: Zap, className: 'blue' },
      { label: 'Сытость', value: marina?.hunger ?? 80, icon: Utensils, className: 'green' },
      { label: 'Спокойствие', value: marina?.calm ?? 75, icon: ShieldCheck, className: 'purple' },
    ]
  }, [player])

  if (loading) return <main className="status-screen">Загружаем день Марины…</main>
  if (error && !player) return <main className="status-screen"><h1>День Марины</h1><p>{error}</p></main>

  const currentPlayer = player!
  const marina = currentPlayer.marina
  const timeLabel = marina.period === 'morning' ? '08:00' : marina.period === 'day' ? '13:00' : marina.period === 'evening' ? '19:00' : '23:00'

  return (
    <main className="game-shell">
      <section className="hud-panel">
        <div className="time-card">
          <strong>{timeLabel}</strong>
          <span>День {marina.day}</span>
          <small><Sun size={15} /> Доброе утро</small>
        </div>
        <div className="stats-row">
          {stats.map(({ label, value, icon: Icon, className }) => (
            <article className={`mini-stat ${className}`} key={label}>
              <div><Icon size={18} /><span>{label}</span></div>
              <strong>{value}/100</strong>
              <div className="meter"><i style={{ width: `${Math.min(100, value)}%` }} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="scene-panel">
        <aside className="left-rail">
          <div className="wallet-card">
            <div><span className="coin-dot">◉</span><strong>{currentPlayer.coins}</strong><button type="button">+</button></div>
            <div><Gem size={20}/><strong>{currentPlayer.crystals}</strong><button type="button">+</button></div>
          </div>
          <button type="button" className="side-action"><Gift size={28}/><span>Ежедневный бонус</span></button>
          <button type="button" className="side-action"><ClipboardList size={28}/><span>Задания</span><b>3</b></button>
        </aside>

        <div className="marina-stage">
          <div className="window-glow" />
          <div className="neon-note">Ты моё<br/>солнышко ♡</div>
          <div className="character-placeholder"><span>М</span></div>
          <div className="speech-bubble"><Heart size={18}/><strong>Марина</strong><p>{message}</p></div>
          <div className="cat-placeholder">🐈</div>
        </div>

        <aside className="wish-card">
          <strong>Марина сегодня хочет:</strong>
          <span>🌳 Прогулка в парке</span>
          <span>🎞 Посмотреть фильм</span>
          <span>☕ Кофе с тобой</span>
        </aside>

        <button type="button" className="talk-button" onClick={() => void performAction('talk')} disabled={busyAction !== null}>
          <Heart size={22}/><span>Поговорить<small>+ настроение</small></span>
        </button>
      </section>

      <section className="action-section">
        <h2>Что будем делать?</h2>
        <div className="action-grid">
          {actions.map(({ id, title, reward, icon: Icon, tone }) => (
            <article className={`action-card ${tone}`} key={id}>
              <div className="action-art"><Icon size={42}/></div>
              <strong>{title}</strong>
              <small>{reward}</small>
              <button type="button" disabled={busyAction !== null} onClick={() => void performAction(id)}>
                {busyAction === id ? 'Подожди…' : 'Выбрать'}
              </button>
            </article>
          ))}
        </div>
        {error && <div className="error-card">{error}</div>}
        <small className="version">{APP_VERSION} · опыт {currentPlayer.experience}</small>
      </section>

      <nav className="bottom-nav">
        <button type="button" className="active"><Home size={23}/><span>Главная</span></button>
        <button type="button"><ShoppingBag size={23}/><span>Магазин</span></button>
        <button type="button"><Shirt size={23}/><span>Гардероб</span></button>
        <button type="button"><Sofa size={23}/><span>Комната</span></button>
        <button type="button"><Trophy size={23}/><span>Достижения</span></button>
      </nav>
    </main>
  )
}
