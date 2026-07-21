import { Coffee, Heart, Home, ShoppingBag, Shirt, Trophy, Zap } from 'lucide-react'

const stats = [
  { label: 'Любовь', value: 78, icon: Heart },
  { label: 'Настроение', value: 64, icon: Zap },
  { label: 'Энергия', value: 53, icon: Coffee },
]

const actions = [
  { title: 'Обнять', reward: '+8 любовь', icon: Heart },
  { title: 'Кофе', reward: '+12 энергия', icon: Coffee },
  { title: 'Поговорить', reward: '+10 настроение', icon: Zap },
]

export default function App() {
  return (
    <main className="game-shell">
      <section className="hero-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">День 1 · Утро</p>
            <h1>День Марины</h1>
          </div>
          <div className="currency">🪙 1 250</div>
        </header>

        <div className="stats-grid">
          {stats.map(({ label, value, icon: Icon }) => (
            <article className="glass-card stat" key={label}>
              <Icon size={18} />
              <div>
                <span>{label}</span>
                <div className="meter"><i style={{ width: `${value}%` }} /></div>
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
