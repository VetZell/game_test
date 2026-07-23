import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createMutationPayload } from './mutationPayload'
import {
  Coffee, Film, Footprints, Gem, Heart, Home, Mail,
  MessageCircle, Send, ShieldCheck, Smile, Sun,
  Utensils, X, Zap,
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
type DayAdvanceResponse = { message: string; player: Player }
type ChatResponse = { reply: string; emotion: string; remembered?: string | null; player: Player }
type ChatLine = { role: 'user' | 'marina'; text: string }
type MarinaEmotion = 'neutral' | 'smile' | 'happy' | 'love' | 'caring' | 'sad' | 'sleepy' | 'surprised' | 'thoughtful' | 'shy'
type MarinaVisual = 'neutral' | 'smile' | 'happy' | 'sad' | 'sleepy' | 'surprised' | 'thoughtful' | 'shy' | 'coffee' | 'breakfast' | 'kiss' | 'movie' | 'walk' | 'talk'

const APP_VERSION = '1.3.1-happy-png'
const API_URL = (import.meta.env.VITE_API_URL || 'https://web-production-9b804.up.railway.app').replace(/\/$/, '')

const actions = [
  { id: 'coffee', title: 'Выпить кофе', reward: '+10 энергии · +5 настроения', cost: '15 монет', icon: Coffee, visual: 'coffee' as MarinaVisual, duration: 3600 },
  { id: 'breakfast', title: 'Позавтракать', reward: '+15 сытости · +5 любви', cost: '25 монет', icon: Utensils, visual: 'breakfast' as MarinaVisual, duration: 3800 },
  { id: 'kind_words', title: 'Сказать тёплые слова', reward: '+10 любви · +10 настроения', cost: 'Бесплатно', icon: Mail, visual: 'kiss' as MarinaVisual, duration: 3200 },
  { id: 'walk', title: 'Пойти на прогулку', reward: '+15 энергии · +5 спокойствия', cost: 'Бесплатно', icon: Footprints, visual: 'walk' as MarinaVisual, duration: 4200 },
  { id: 'movie', title: 'Посмотреть фильм', reward: '+10 настроения · +5 спокойствия', cost: '20 монет', icon: Film, visual: 'movie' as MarinaVisual, duration: 4200 },
]

const emotionConfig: Record<MarinaEmotion, { label: string; visual: MarinaVisual; tone: string }> = {
  neutral: { label: 'Спокойная', visual: 'neutral', tone: 'neutral' },
  smile: { label: 'Улыбается', visual: 'smile', tone: 'warm' },
  happy: { label: 'Счастливая', visual: 'happy', tone: 'happy' },
  love: { label: 'Влюблена', visual: 'happy', tone: 'love' },
  caring: { label: 'Заботливая', visual: 'thoughtful', tone: 'caring' },
  sad: { label: 'Грустит', visual: 'sad', tone: 'sad' },
  sleepy: { label: 'Хочет спать', visual: 'sleepy', tone: 'sleepy' },
  surprised: { label: 'Удивлена', visual: 'surprised', tone: 'bright' },
  thoughtful: { label: 'Задумалась', visual: 'thoughtful', tone: 'calm' },
  shy: { label: 'Смущается', visual: 'shy', tone: 'shy' },
}

function resolveEmotion(rawEmotion: string | null | undefined, fallback: MarinaEmotion): MarinaEmotion {
  if (rawEmotion && rawEmotion in emotionConfig) return rawEmotion as MarinaEmotion
  return fallback
}

const idleLines: Record<MarinaEmotion, string[]> = {
  neutral: ['Мне хорошо, когда ты рядом.', 'Расскажи, как проходит твой день.', 'Давай сегодня никуда не спешить.'],
  smile: ['Я рада тебя видеть 😊', 'У меня сегодня хорошее настроение.', 'Рядом с тобой так уютно.'],
  happy: ['Я сегодня такая счастливая ❤️', 'Хочется крепко тебя обнять.', 'Спасибо, что заботишься обо мне.'],
  love: ['Я чувствую твоё тепло ❤️', 'С тобой мне очень нежно.', 'Сегодня хочется быть ближе к тебе.'],
  caring: ['Давай беречь друг друга.', 'Мне спокойно от твоей заботы.', 'Спасибо, что замечаешь моё настроение.'],
  sad: ['Мне немного грустно… побудь со мной.', 'Можно я просто посижу рядом?', 'Мне сейчас нужны твои тёплые слова.'],
  sleepy: ['Я уже немного засыпаю 😴', 'Кажется, мне пора отдохнуть.', 'Можно я положу голову тебе на плечо?'],
  surprised: ['Ой! Я этого не ожидала 😲', 'Ты умеешь меня удивлять.', 'Вот это неожиданность!'],
  thoughtful: ['Я кое о чём задумалась…', 'Иногда хочется просто помолчать вместе.', 'Как думаешь, что делает день по-настоящему хорошим?'],
  shy: ['Ты меня смущаешь 😊', 'Не смотри так… я краснею.', 'Мне очень приятно это слышать.'],
}

const periodMeta: Record<string, { label: string; time: string; next: string; nextLabel: string }> = {
  morning: { label: 'Доброе утро', time: '08:00', next: 'day', nextLabel: 'дню' },
  day: { label: 'Добрый день', time: '13:00', next: 'evening', nextLabel: 'вечеру' },
  evening: { label: 'Добрый вечер', time: '19:00', next: 'night', nextLabel: 'ночи' },
  night: { label: 'Спокойной ночи', time: '23:00', next: 'morning', nextLabel: 'новому утру' },
}

function deriveEmotion(player: Player): MarinaEmotion {
  const m = player.marina
  if (m.period === 'night' || m.energy <= 22) return 'sleepy'
  if (m.mood <= 32 || m.love <= 25) return 'sad'
  if (m.romance >= 75 && m.love >= 70) return 'shy'
  if (m.love >= 85 && m.mood >= 75) return 'love'
  if (m.calm <= 35 || m.trust <= 30) return 'thoughtful'
  if (m.mood >= 65 || m.love >= 65) return 'smile'
  return 'neutral'
}

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [dayBusy, setDayBusy] = useState(false)
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
    const resolved = resolveEmotion(nextEmotion, 'neutral')
    emotionRef.current = resolved
    setEmotion(resolved)
    actionActiveRef.current = false
    if (visualTimer.current !== null) {
      window.clearTimeout(visualTimer.current)
      visualTimer.current = null
    }
    setActiveVisual(emotionConfig[resolved].visual)
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
    if (!player || busyAction || dayBusy || chatOpen || chatBusy) return
    const timer = window.setInterval(() => {
      if (actionActiveRef.current) return
      const lines = idleLines[emotionRef.current]
      setMessage(lines[Math.floor(Math.random() * lines.length)])
    }, 45000)
    return () => window.clearInterval(timer)
  }, [player, busyAction, dayBusy, chatOpen, chatBusy])

  function showVisual(visual: MarinaVisual, duration: number) {
    if (visualTimer.current !== null) window.clearTimeout(visualTimer.current)
    actionActiveRef.current = true
    setActiveVisual(visual)
    visualTimer.current = window.setTimeout(() => {
      actionActiveRef.current = false
      setActiveVisual(emotionConfig[emotionRef.current].visual)
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
      const payload = createMutationPayload({ init_data: initData, action })
      const response = await fetch(`${API_URL}/api/v1/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), cache: 'no-store',
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

  async function advanceDay() {
    if (dayBusy) return
    const initData = window.Telegram?.WebApp?.initData || ''
    if (!initData) return
    setDayBusy(true)
    setError(null)
    try {
      const payload = createMutationPayload({ init_data: initData })
      const response = await fetch(`${API_URL}/api/v1/day/advance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), cache: 'no-store',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail || `Ошибка перехода дня: ${response.status}`)
      }
      const result: DayAdvanceResponse = await response.json()
      setPlayer(result.player)
      setMessage(result.message)
      applyEmotion(deriveEmotion(result.player))
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось продолжить день')
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally { setDayBusy(false) }
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
    showVisual('talk', 2600)
    try {
      const payload = createMutationPayload({ init_data: initData, message: text })
      const response = await fetch(`${API_URL}/api/v1/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), cache: 'no-store',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.detail || `Ошибка разговора: ${response.status}`)
      }
      const result: ChatResponse = await response.json()
      setPlayer(result.player)
      applyEmotion(resolveEmotion(result.emotion, deriveEmotion(result.player)))
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
  const currentPeriod = periodMeta[marina.period] || periodMeta.morning
  const timeLabel = currentPeriod.time
  const periodLabel = currentPeriod.label
  const emotionDisplay = emotionConfig[emotion]
  const marinaImage = `/marina/v2/${activeVisual}.webp`

  return (
    <main className="game-shell">
      <section className="hud-panel">
        <div className="time-card"><div className="time-main"><strong>{timeLabel}</strong><span>День {marina.day}</span></div><small><Sun size={15} aria-hidden="true"/> {periodLabel}</small><button type="button" className="advance-day-button" onClick={() => void advanceDay()} disabled={dayBusy || busyAction !== null || chatBusy} aria-busy={dayBusy}>{dayBusy ? 'Переходим…' : `Продолжить день → ${currentPeriod.nextLabel}`}</button></div>
        <div className="stats-row">{stats.map(({ label, value, icon: Icon, className }) => (
          <article className={`mini-stat ${className}`} key={label}><div><Icon size={17}/><span>{label}</span></div><strong>{value}/100</strong><div className="meter"><i style={{ width: `${Math.min(100, value)}%` }}/></div></article>
        ))}</div>
      </section>

      <section className={`scene-panel period-${marina.period} emotion-${emotion} scene-visual-${activeVisual}`}>
        <div className="room-scene" aria-hidden="true">
          <div className="room-wall"/><div className="room-window"><span/><span/><i/></div><div className="room-curtain left"/><div className="room-curtain right"/>
          <div className="room-shelf"><i/><i/><i/></div><div className="room-lamp"><span/><i/></div><div className="room-plant"><i/><i/><i/><b/></div>
          <div className="room-sofa"><span/><span/></div><div className="room-rug"/><div className="room-floor"/>
        </div>

        <aside className="left-rail" aria-label="Ресурсы игрока">
          <div className="wallet-card"><div><span className="coin-dot" aria-hidden="true">◉</span><span>Монеты</span><strong>{currentPlayer.coins}</strong></div><div><Gem size={19} aria-hidden="true"/><span>Кристаллы</span><strong>{currentPlayer.crystals}</strong></div></div>
        </aside>

        <div className={`marina-character visual-${activeVisual} tone-${emotionDisplay.tone}`}><div className="marina-aura"/><img src={marinaImage} alt={`Марина: ${emotionDisplay.label}`} draggable={false}/><span className="emotion-badge">{emotionDisplay.label}</span></div>

        <div className="speech-bubble" aria-live="polite"><div className="speech-title"><Heart size={17} aria-hidden="true"/><strong>Марина</strong><span>{emotionDisplay.label}</span></div><p>{message}</p></div>
        <aside className="wish-card"><strong>Фокус сейчас</strong><span>Эмоция: {emotionDisplay.label}</span><span>Следующий переход: {currentPeriod.nextLabel}</span></aside>
        <button type="button" className="talk-button" onClick={() => { showVisual('talk', 2200); setChatOpen(true) }}><MessageCircle size={22} aria-hidden="true"/><span>Поговорить<small>Марина помнит диалог</small></span></button>
      </section>

      <section className="action-section"><div className="section-heading"><h2>Чем займёмся?</h2><span>Опыт {currentPlayer.experience}</span></div><div className="action-grid">{actions.map(({ id, title, reward, cost, icon: Icon, visual, duration }) => (
        <button className={`action-card ${busyAction === id ? 'is-pending' : ''}`} type="button" key={id} disabled={busyAction !== null || dayBusy || chatBusy} aria-busy={busyAction === id} onClick={() => void performAction(id, visual, duration)}>
          <div className="action-art"><img src={`/marina/v2/${visual}.webp`} alt="" aria-hidden="true" loading="lazy"/><span className="action-icon"><Icon size={21} aria-hidden="true"/></span></div>
          <strong>{busyAction === id ? 'Выполняем…' : title}</strong><small>{reward}</small><em>{cost}</em>
        </button>
      ))}</div>{error && <div className="error-card" role="alert">{error}</div>}<small className="version">{APP_VERSION} · опыт {currentPlayer.experience}</small></section>

      <nav className="bottom-nav" aria-label="Основная навигация"><button type="button" className="active" aria-current="page"><Home size={23} aria-hidden="true"/><span>Главная</span></button><span className="nav-placeholder">Скоро: магазин</span><span className="nav-placeholder">Гардероб</span><span className="nav-placeholder">Комната</span></nav>

      {chatOpen && <div className="chat-overlay" role="dialog" aria-modal="true"><section className="chat-panel"><header><div><Heart size={20}/><span><strong>Марина</strong><small>{emotionDisplay.label} · помнит разговоры</small></span></div><button type="button" aria-label="Закрыть чат" onClick={() => setChatOpen(false)}><X size={22} aria-hidden="true"/></button></header><div className="chat-history">{chatLines.map((line, index) => <div className={`chat-line ${line.role}`} key={`${line.role}-${index}`}>{line.text}</div>)}{chatBusy && <div className="chat-line marina typing">Марина печатает…</div>}</div><form className="chat-form" onSubmit={sendChat}><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Напиши Марине…" maxLength={500}/><button type="submit" aria-label="Отправить сообщение" disabled={chatBusy || !chatInput.trim()} aria-busy={chatBusy}><Send size={20} aria-hidden="true"/></button></form></section></div>}
    </main>
  )
}
