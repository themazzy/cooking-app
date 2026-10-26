import Icon from './Icon.jsx'

const TABS = [
  { page: 'home', hash: '#/', label: 'Recipes', icon: 'book' },
  { page: 'plan', hash: '#/plan', label: 'Plan', icon: 'calendar' },
  { page: 'shopping', hash: '#/shopping', label: 'Shopping', icon: 'cart' },
  { page: 'pantry', hash: '#/pantry', label: 'At home', icon: 'home' },
  { page: 'ingredients', hash: '#/ingredients', label: 'Ingredients', icon: 'carrot' },
]

/** The app's main sections, at the bottom where a thumb reaches them. */
export default function TabBar({ page, badges = {}, onGo }) {
  return (
    <nav className="tabbar" aria-label="Sections">
      {TABS.map((t) => (
        <button key={t.page} className={page === t.page ? 'active' : ''} aria-current={page === t.page ? 'page' : undefined} onClick={() => onGo(t.hash)}>
          <span className="tab-icon" aria-hidden="true">
            <Icon name={t.icon} size={22} />
            {badges[t.page] ? <span className="tab-badge">{badges[t.page]}</span> : null}
          </span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
