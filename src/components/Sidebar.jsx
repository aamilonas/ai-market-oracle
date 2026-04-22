import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import styles from './Sidebar.module.css'

const publicLinks = [
  { group: 'Analysis', items: [
    { to: '/leaderboard', label: 'Leaderboard', icon: '📊' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
    { to: '/paper-trading', label: 'Paper Trading', icon: '📋' },
    { to: '/weekly', label: 'Weekly Recap', icon: '📰' },
  ]},
  { group: 'Info', items: [
    { to: '/methodology', label: 'Methodology', icon: '📐' },
    { to: '/about', label: 'About', icon: '💡' },
  ]},
]

const authLinks = [
  { group: 'Trading', items: [
    { to: '/dashboard', label: 'Dashboard', icon: '⌘' },
    { to: '/signals', label: 'Signals', icon: '⚡' },
    { to: '/portfolio', label: 'Portfolio', icon: '💼' },
  ]},
  { group: 'Analysis', items: [
    { to: '/leaderboard', label: 'Leaderboard', icon: '📊' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
    { to: '/paper-trading', label: 'Paper Trading', icon: '📋' },
    { to: '/weekly', label: 'Weekly Recap', icon: '📰' },
  ]},
  { group: 'Settings', items: [
    { to: '/connect-brokerage', label: 'Brokerage', icon: '🔗' },
    { to: '/alerts', label: 'Alerts', icon: '🔔' },
    { to: '/settings', label: 'Configuration', icon: '⚙️' },
  ]},
]

export default function Sidebar() {
  const { isLoggedIn, logout } = useAuth()
  const navGroups = isLoggedIn ? authLinks : publicLinks

  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        <NavLink to={isLoggedIn ? '/dashboard' : '/'} className={styles.logo}>
          <span className={styles.logoMark}>◆</span>
          <span className={styles.logoText}>Oracle Trade</span>
        </NavLink>
      </div>

      <nav className={styles.nav}>
        {navGroups.map(({ group, items }) => (
          <div key={group} className={styles.group}>
            <span className={styles.groupLabel}>{group}</span>
            {items.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [styles.link, isActive ? styles.active : ''].join(' ')
                }
              >
                <span className={styles.linkIcon}>{icon}</span>
                <span className={styles.linkLabel}>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        {isLoggedIn ? (
          <button onClick={logout} className={styles.link}>
            <span className={styles.linkIcon}>↩</span>
            <span className={styles.linkLabel}>Log out</span>
          </button>
        ) : (
          <NavLink to="/signup" className={[styles.link, styles.ctaLink].join(' ')}>
            <span className={styles.linkIcon}>→</span>
            <span className={styles.linkLabel}>Get Started</span>
          </NavLink>
        )}
      </div>
    </aside>
  )
}
