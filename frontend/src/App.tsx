import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardList, Coffee, Film, Footprints, Gem, Gift, Heart, Home, Mail,
  MessageCircle, Send, ShoppingBag, Shirt, ShieldCheck, Smile, Sofa, Sun,
  Trophy, Utensils, X, Zap,
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
type MarinaEmotion = 'neutral' | 'smile' | 'happy' | 'sad' | 'sleepy' | 'surprised' | 'thoughtful' | 'shy'
type MarinaVisual = MarinaEmotion | 'coffee' | 'breakfast' | 'kiss' | 'stretch' | 'cat'

const APP_VERSION = '1.1.0-room-scene'
const API_URL = (import.meta.env.VITE_API_URL || 'https://web-production-9b804.up.railway.app').replace(/\/$/, '')

const actions = [
  { id: 'coffee', title: 'Выпить кофе', reward: '+10 энергии · +5 настроения', icon: Coffee, visual: 'coffee' as MarinaVisual, duration: 3600 },
  { id: 'breakfast', title: 'Позавтракать', reward: '+15 сытости · +5 любви', icon: Utensils, visual: 'breakfast' as MarinaVisual, duration: 3800 },
  { id: 'kind_words', title: 'Сказать тёплые слова', reward: '+10 любви · +10 настроения', icon: Mail, visual: 'kiss' as MarinaVisual, duration: 3200 },
  { id: 'walk', title: 'Пойти на прогулку', reward: '+15 энергии · +5 спокойствия', icon: Footprints, visual: 'stretch' as MarinaVisual, duration: 3500 },
  { id: 'movie', title: 'Посмотреть фильм', reward: '+10 настроения · +5 спокойствия', icon: Film, visual: 'cat' as MarinaVisual, duration: 3800 },
]

const emotionLabels: Record<MarinaEmotion, string> = {
  neutral: 'Спокойная', smile: 'Улыбается', happy: 'Счастливая', sad: 'Грустит',
  sleepy: 'Хочет спать', surprised: 'Удивлена', thoughtful: 'Задумалась', shy: 'Смущается',
}

const emotionVisuals: Record<string, MarinaEmotion> = {
  neutral: 'neutral', smile: 'smile', happy: 'happy', love: 'happy', sad: 'sad',
  caring: 'thoughtful', sleepy: 'sleepy', surprised: 'surprised', thoughtful: 'thoughtful', shy: 'shy',
}

const idleLines: Record<MarinaEmotion, string[]> = {
  neutral: ['Мне хорошо, когда ты рядом.', 'Расскажи, как проходит твой день.', 'Давай сегодня никуда не спешить.'],
  smile: ['Я рада тебя видеть 😊', 'У меня сегодня хорошее настроение.', 'Рядом с тобой так уютно.'],
  happy: ['Я сегодня такая счастливая ❤️', 'Хочется крепко тебя обнять.', 'Спасибо, что заботишься обо мне.'],
  sad: ['Мне немного грустно… побудь со мной.', 'Можно я просто посижу рядом?', 'Мне сейчас нужны твои тёплые слова.'],
  sleepy: ['Я уже немного засыпаю 😴', 'Кажется, мне пора отдохнуть.', 'Можно я положу голову тебе на плечо?'],
  surprised: ['Ой! Я этого не ожидала 😲', 'Ты умеешь меня удивлять.', 'Вот это неожиданность!'],
  thoughtful: ['Я кое о чём задумалась…', 'Иногда хочется просто помолчать вместе.', 'Как думаешь, что делает день по-настоящему хорошим?'],
  shy: ['Ты меня смущаешь 😊', 'Не смотри так… я краснею.', 'Мне очень приятно это слышать.'],
}

function deriveEmotion(player: Player): MarinaEmotion {
  const m = player.marina
  if (m.period === 'night' || m.energy <= 22) return 'sleepy'
  if (m.mood <= 32 || m.love <= 25) return 'sad'
  if (m.romance >= 75 && m.love >= 70) return 'shy'
  if (m.love >= 85 && m.mood >= 75) return 'happy'
  if (m.calm <= 35 || m.trust <= 30) return 'thoughtful'
  if (m.mood >= 65 || m.love >= 65) return 'smile'
  return 'neutral'
}

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [message, setMessage] = useState('Доброе утро ☀️ Как ты спал? Я уже успела соскучиться.')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [emotion, setEmotion] = useState<MarinaEmotion>('neutral')
  const [activeVisual, setActiveVisual] = useState<MarinaVisual>('neutral')
  const [chatLines, setChatLines] = useState<ChatLine[]>([{ role: 'marina', text: 'Я здесь. Расскажи, о чём ты думаешь ❤️' }])

  const visualTimer = useRef<number | null>(null)
  const emotionRef = useRef<MarinaEmotion>('neutral')
  const actionActiveRef = useRef(false)

  function applyEmotion(nextEmotion: MarinaEmotion) {
    emotionRef.current = nextEmotion
    setEmotion(nextEmotion)
    if (!actionActiveRef.current) setActiveVisual(nextEmotion)
  }

  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    webApp?.ready()
    webApp?.expand()
    webApp?.setHeaderColor('#0b0912')
    webApp?.setBackgroundColor('#0b0912')

    async function login() {
      const initData = webApp?.initData || ''
      if (!initData) {
        setError('Открой игру через кнопку Telegram-бота.')
        setLoading(false)
        return
      }
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/telegram`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init_data: initData }), cache: 'no-store',
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.detail || `Ошибка авторизации: ${response.status}`)
        }
        const loggedPlayer: Player = await response.json()
        setPlayer(loggedPlayer)
        applyEmotion(deriveEmotion(loggedPlayer))
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Не удалось войти в игру')
      } finally { setLoading(false) }
    }
    void login()
    return () => { if (visualTimer.current !== null) window.clearTimeout(visualTimer.current) }
  }, [])

  useEffect(() => {
    if (!player || busyAction || chatOpen || chatBusy) return
    const timer = window.setInterval(() => {
      if (actionActiveRef.current) return
      const lines = idleLines[emotionRef.current]
      setMessage(lines[Math.floor(Math.random() * lines.length)])
    }, 45000)
    return () => window.clearInterval(timer)
  }, [player, busyAction, chatOpen, chatBusy])

  function showVisual(visual: MarinaVisual, duration: number) {
    if (visualTimer.current !== null) window.clearTimeout(visualTimer.current)
    actionActiveRef.current = true
    setActiveVisual(visual)
    visualTimer.current = window.setTimeout(() => {
      actionActiveRef.current = false
      setActiveVisual(emotionRef.current)
      visualTimer.current = null
    }, duration)
  }

  async function performAction(action: string, visual: MarinaVisual, duration: number) {
    if (busyAction) return
    const initData = window.Telegram?.WebApp?.initData || ''
    if (!initData) return
    showVisual(visual, duration)
    setBusyAction(action)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/v1/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, action }), cache: 'no-store',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail || `Ошибка действия: ${response.status}`)
      }
      const result: ActionResponse = await response.json()
      setPlayer(result.player)
      setMessage(result.message)
      applyEmotion(deriveEmotion(result.player))
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось выполнить действие')
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally { setBusyAction(null) }
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, message: text }), cache: 'no-store',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail || `Ошибка разговора: ${response.status}`)
      }
      const result: ChatResponse = await response.json()
      setPlayer(result.player)
      applyEmotion(emotionVisuals[result.emotion] || deriveEmotion(result.player))
      setMessage(result.reply)
      setChatLines((lines) => [...lines, { role: 'marina', text: result.reply }])
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch (reason) {
      const textError = reason instanceof Error ? reason.message : 'Марина сейчас не смогла ответить'
      setError(textError)
      setChatLines((lines) => [...lines, { role: 'marina', text: 'Что-то не получилось. Давай попробуем ещё раз.' }])
    } finally { setChatBusy(false) }
  }

  const stats = useMemo(() => {
    const m = player?.marina
    return [
      { label: 'Любовь', value: m?.love ?? 50, icon: Heart, className: 'pink' },
      { label: 'Настроение', value: m?.mood ?? 80, icon: Smile, className: 'orange' },
      { label: 'Энергия', value: m?.energy ?? 100, icon: Zap, className: 'blue' },
      { label: 'Сытость', value: m?.hunger ?? 80, icon: Utensils, className: 'green' },
      { label: 'Спокойствие', value: m?.calm ?? 75, icon: ShieldCheck, className: 'purple' },
    ]
  }, [player])

  if (loading) return <main className="status-screen">Загружаем день Марины…</main>
  if (error && !player) return <main className="status-screen"><h1>День Марины</h1><p>{error}</p></main>

  const currentPlayer = player!
  const marina = currentPlayer.marina
  const timeLabel = marina.period === 'morning' ? '08:00' : marina.period === 'day' ? '13:00' : marina.period === 'evening' ? '19:00' : '23:00'
  const periodLabel = marina.period === 'morning' ? 'Доброе утро' : marina.period === 'day' ? 'Добрый день' : marina.period === 'evening' ? 'Добрый вечер' : 'Спокойной ночи'
  const marinaImage = activeVisual === 'neutral' ? '/marina/main.webp' : `/marina/${activeVisual}.webp`

  return (
    <main className="game-shell">
      <section className="hud-panel">
        <div className="time-card"><strong>{timeLabel}</strong><span>День {marina.day}</span><small><Sun size={15}/> {periodLabel}</small></div>
        <div className="stats-row">{stats.map(({ label, value, icon: Icon, className }) => (
          <article className={`mini-stat ${className}`} key={label}><div><Icon size={17}/><span>{label}</span></div><strong>{value}/100</strong><div className="meter"><i style={{ width: `${Math.min(100, value)}%` }}/></div></article>
        ))}</div>
      </section>

      <section className={`scene-panel period-${marina.period} emotion-${emotion}`}>
        <div className="room-scene" aria-hidden="true">
          <div className="room-wall"/><div className="room-window"><span/><span/><i/></div><div className="room-curtain left"/><div className="room-curtain right"/>
          <div className="room-shelf"><i/><i/><i/></div><div className="room-lamp"><span/><i/></div><div className="room-plant"><i/><i/><i/><b/></div>
          <div className="room-sofa"><span/><span/></div><div className="room-rug"/><div className="room-floor"/>
        </div>

        <aside className="left-rail">
          <div className="wallet-card"><div><span className="coin-dot">◉</span><strong>{currentPlayer.coins}</strong><button type="button">+</button></div><div><Gem size={19}/><strong>{currentPlayer.crystals}</strong><button type="button">+</button></div></div>
          <button type="button" className="side-action"><Gift size={25}/><span>Ежедневный<br/>бонус</span></button>
          <button type="button" className="side-action"><ClipboardList size={25}/><span>Задания</span><b>3</b></button>
        </aside>

        <div className={`marina-character visual-${activeVisual}`}><div className="marina-aura"/><img src={marinaImage} alt={`Марина: ${emotionLabels[emotion]}`} draggable={false}/><span className="emotion-badge">{emotionLabels[emotion]}</span></div>

        <div className="speech-bubble"><div className="speech-title"><Heart size={17}/><strong>Марина</strong></div><p>{message}</p></div>

        <aside className="wish-card"><strong>Сегодня Марина хочет:</strong><span>🌳 Прогуляться в парке</span><span>🎬 Посмотреть фильм</span><span>☕ Выпить кофе вместе</span></aside>

        <button type="button" className="talk-button" onClick={() => setChatOpen(true)}><MessageCircle size={22}/><span>Поговорить<small>Марина помнит диалог</small></span></button>
      </section>

      <section className="action-section"><h2>Чем займёмся?</h2><div className="action-grid">{actions.map(({ id, title, reward, icon: Icon, visual, duration }) => (
        <article className="action-card" key={id}><div className="action-art"><img src={`/marina/${visual}.webp`} alt={title} loading="lazy"/><span className="action-icon"><Icon size={21}/></span></div><strong>{title}</strong><small>{reward}</small><button type="button" disabled={busyAction !== null} onClick={() => void performAction(id, visual, duration)}>{busyAction === id ? 'Марина занята…' : 'Выбрать'}</button></article>
      ))}</div>{error && <div className="error-card">{error}</div>}<small className="version">{APP_VERSION} · опыт {currentPlayer.experience}</small></section>

      <nav className="bottom-nav"><button type="button" className="active"><Home size={23}/><span>Главная</span></button><button type="button"><ShoppingBag size={23}/><span>Магазин</span></button><button type="button"><Shirt size={23}/><span>Гардероб</span></button><button type="button"><Sofa size={23}/><span>Комната</span></button><button type="button"><Trophy size={23}/><span>Достижения</span></button></nav>

      {chatOpen && <div className="chat-overlay" role="dialog" aria-modal="true"><section className="chat-panel"><header><div><Heart size={20}/><span><strong>Марина</strong><small>{emotionLabels[emotion]} · помнит разговоры</small></span></div><button type="button" onClick={() => setChatOpen(false)}><X size={22}/></button></header><div className="chat-history">{chatLines.map((line, index) => <div className={`chat-line ${line.role}`} key={`${line.role}-${index}`}>{line.text}</div>)}{chatBusy && <div className="chat-line marina typing">Марина печатает…</div>}</div><form className="chat-form" onSubmit={sendChat}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Напиши Марине…" maxLength={500}/><button type="submit" disabled={chatBusy || !chatInput.trim()}><Send size={20}/></button></form></section></div>}
    </main>
  )
}
