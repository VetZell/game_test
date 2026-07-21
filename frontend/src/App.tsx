import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
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
  MessageCircle,
  Send,
  ShoppingBag,
  Shirt,
  ShieldCheck,
  Smile,
  Sofa,
  Sun,
  Trophy,
  Utensils,
  X,
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
type ChatResponse = { reply: string; emotion: string; remembered?: string | null; player: Player }
type ChatLine = { role: 'user' | 'marina'; text: string }

type MarinaVisual =
  | 'neutral'
  | 'smile'
  | 'happy'
  | 'sad'
  | 'sleepy'
  | 'surprised'
  | 'thoughtful'
  | 'shy'
  | 'coffee'
  | 'breakfast'
  | 'kiss'
  | 'stretch'
  | 'cat'

const APP_VERSION = '0.9.0-marina-emotions'
const API_URL = (import.meta.env.VITE_API_URL || 'https://web-production-9b804.up.railway.app').replace(/\/$/, '')

const actions = [
  { id: 'coffee', title: 'Кофе', reward: '+10 энергия · +5 настроение', icon: Coffee, tone: 'coffee', visual: 'coffee' as MarinaVisual },
  { id: 'breakfast', title: 'Завтрак', reward: '+15 сытость · +5 любовь', icon: Utensils, tone: 'breakfast', visual: 'breakfast' as MarinaVisual },
  { id: 'kind_words', title: 'Добрые слова', reward: '+10 любовь · +10 настроение', icon: Mail, tone: 'words', visual: 'kiss' as MarinaVisual },
  { id: 'walk', title: 'Прогулка', reward: '+15 энергия · +5 спокойствие', icon: Footprints, tone: 'walk', visual: 'stretch' as MarinaVisual },
  { id: 'movie', title: 'Фильм', reward: '+10 настроение · +5 спокойствие', icon: Film, tone: 'movie', visual: 'cat' as MarinaVisual },
]

const emotionVisuals: Record<string, MarinaVisual> = {
  neutral: 'neutral',
  smile: 'smile',
  happy: 'happy',
  love: 'happy',
  sad: 'sad',
  caring: 'sad',
  sleepy: 'sleepy',
  surprised: 'surprised',
  thoughtful: 'thoughtful',
  shy: 'shy',
}

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [message, setMessage] = useState('Доброе утро! ☀️ Как ты спал?')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [emotion, setEmotion] = useState('neutral')
  const [activeVisual, setActiveVisual] = useState<MarinaVisual>('neutral')
  const visualTimer = useRef<number | null>(null)
  const [chatLines, setChatLines] = useState<ChatLine[]>([
    { role: 'marina', text: 'Я здесь. Расскажи, о чём ты думаешь ❤️' },
  ])

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

    return () => {
      if (visualTimer.current !== null) window.clearTimeout(visualTimer.current)
    }
  }, [])

  function showVisual(visual: MarinaVisual, duration = 3200) {
    if (visualTimer.current !== null) window.clearTimeout(visualTimer.current)
    setActiveVisual(visual)
    visualTimer.current = window.setTimeout(() => {
      setActiveVisual(emotionVisuals[emotion] || 'neutral')
      visualTimer.current = null
    }, duration)
  }

  async function performAction(action: string, visual: MarinaVisual) {
    if (busyAction) return
    const initData = window.Telegram?.WebApp?.initData || ''
    if (!initData) return

    showVisual(visual)
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

  async function sendChat(event: FormEvent) {
    event.preventDefault()
    const text = chatInput.trim()
    const initData = window.Telegram?.WebApp?.initData || ''
    if (!text || !initData || chatBusy) return

    setChatLines((lines) => [...lines, { role: 'user', text }])
    setChatInput('')
    setChatBusy(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, message: text }),
        cache: 'no-store',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail || `Ошибка разговора: ${response.status}`)
      }
      const result: ChatResponse = await response.json()
      const nextVisual = emotionVisuals[result.emotion] || 'neutral'
      setPlayer(result.player)
      setEmotion(result.emotion)
      setActiveVisual(nextVisual)
      setMessage(result.reply)
      setChatLines((lines) => [...lines, { role: 'marina', text: result.reply }])
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch (reason) {
      const textError = reason instanceof Error ? reason.message : 'Марина сейчас не смогла ответить'
      setError(textError)
      setChatLines((lines) => [...lines, { role: 'marina', text: 'Что-то не получилось. Давай попробуем ещё раз.' }])
    } finally {
      setChatBusy(false)
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
  const marinaImage = `/marina/${activeVisual}.webp`

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

      <section className={`scene-panel emotion-${emotion}`}>
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
          <div className={`marina-character visual-${activeVisual}`}>
            <div className="marina-aura" />
            <img src={marinaImage} alt={`Марина: ${activeVisual}`} draggable={false} />
          </div>
          <div className="speech-bubble"><Heart size={18}/><strong>Марина</strong><p>{message}</p></div>
        </div>

        <aside className="wish-card">
          <strong>Марина сегодня хочет:</strong>
          <span>🌳 Прогулка в парке</span>
          <span>🎞 Посмотреть фильм</span>
          <span>☕ Кофе с тобой</span>
        </aside>

        <button type="button" className="talk-button" onClick={() => setChatOpen(true)}>
          <MessageCircle size={22}/><span>Поговорить<small>ИИ-память</small></span>
        </button>
      </section>

      <section className="action-section">
        <h2>Что будем делать?</h2>
        <div className="action-grid">
          {actions.map(({ id, title, reward, icon: Icon, tone, visual }) => (
            <article className={`action-card ${tone}`} key={id}>
              <div className="action-art">
                <img src={`/marina/${visual}.webp`} alt={title} loading="lazy" />
                <span className="action-icon"><Icon size={22}/></span>
              </div>
              <strong>{title}</strong>
              <small>{reward}</small>
              <button type="button" disabled={busyAction !== null} onClick={() => void performAction(id, visual)}>
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

      {chatOpen && (
        <div className="chat-overlay" role="dialog" aria-modal="true">
          <section className="chat-panel">
            <header>
              <div><Heart size={20}/><span><strong>Марина</strong><small>помнит ваши разговоры</small></span></div>
              <button type="button" onClick={() => setChatOpen(false)}><X size={22}/></button>
            </header>
            <div className="chat-history">
              {chatLines.map((line, index) => (
                <div className={`chat-line ${line.role}`} key={`${line.role}-${index}`}>{line.text}</div>
              ))}
              {chatBusy && <div className="chat-line marina typing">Марина печатает…</div>}
            </div>
            <form className="chat-form" onSubmit={sendChat}>
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Напиши Марине…"
                maxLength={500}
              />
              <button type="submit" disabled={chatBusy || !chatInput.trim()}><Send size={20}/></button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
