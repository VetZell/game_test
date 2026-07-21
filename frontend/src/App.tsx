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
  }
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const actions = [
  { title: 'Обнять', reward: '+8 любовь', icon: Heart },
  { title: 'Кофе', reward: '+12 энергия', icon: Coffee },
  { title: 'Поговорить', reward: '+10 настроение', icon: Zap },
]

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    webApp?.ready()
    webApp?.expand()
    webApp?.setHeaderColor('#0b0914')
    webApp?.setBackgroundColor('#0b0914')

    async function login() {
      if (!webApp?.initData) {
        setError('Открой игру через кнопку Telegram-бота.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_URL}/api/v1/auth/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init_data: webApp.initData }),
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

  if (error) {
    return (
      <main className="game-shell status-screen">
        <h1>День Марины</h1>
        <p>{error}</p>
      </main>
    )
  }

  const marina = player!.marina
  const playerName = player!.first_name || 'Игрок'

  return (
    <main className="game-shell">
      <section className="hero-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">День {marina.day} · {marina.period === 'morning' ? 'Утро' : marina.period}</p>
            <h1>День Марины</h1>
            <small>Привет, {playerName}</small>
          </div>
          <div className="currency">🪙 {player!.coins.toLocaleString('ru-RU')}</div>
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
            <p>Доброе утро ❤️</p>
            <span>Я немного сонная. Сделаешь мне кофе?</span>
          </div>
        </div>

        <section className="actions">
          {actions.map(({ title, reward, icon: Icon }) => (
            <button className="action-card" key={title}>
              <Icon size={22} />
              <span>{title}</span>
              <small>{reward}</small>
            </button>
          ))}
        </section>
      </section>

      <nav className="bottom-nav">
        <button className="active"><Home size={20} /><span>Главная</span></button>
        <button><ShoppingBag size={20} /><span>Магазин</span></button>
        <button><Shirt size={20} /><span>Гардероб</span></button>
        <button><Trophy size={20} /><span>Награды</span></button>
      </nav>
    </main>
  )
}
