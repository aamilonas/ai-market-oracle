import { NavLink } from 'react-router-dom'
import {
  Trophy,
  LineChart,
  ClipboardList,
  Newspaper,
  Ruler,
  Info,
  LayoutDashboard,
  LayoutGrid,
  Zap,
  Briefcase,
  Link2,
  Bell,
  Settings,
  LogOut,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import ThemeToggle from './ThemeToggle'
import styles from './Sidebar.module.css'

const ICON_SIZE = 16
const ICON_STROKE = 1.75

const publicLinks = [
  { group: 'Analysis', items: [
    { to: '/predictions', label: 'Predictions', Icon: LayoutGrid },
    { to: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
    { to: '/analytics', label: 'Analytics', Icon: LineChart },
    { to: '/paper-trading', label: 'Paper Trading', Icon: ClipboardList },
    { to: '/weekly', label: 'Weekly Recap', Icon: Newspaper },
  ]},
  { group: 'Info', items: [
    { to: '/methodology', label: 'Methodology', Icon: Ruler },
    { to: '/about', label: 'About', Icon: Info },
  ]},
]

const authLinks = [
  { group: 'Trading', items: [
    { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { to: '/signals', label: 'Signals', Icon: Zap },
    { to: '/portfolio', label: 'Portfolio', Icon: Briefcase },
  ]},
  { group: 'Analysis', items: [
    { to: '/predictions', label: 'Predictions', Icon: LayoutGrid },
    { to: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
    { to: '/analytics', label: 'Analytics', Icon: LineChart },
    { to: '/paper-trading', label: 'Paper Trading', Icon: ClipboardList },
    { to: '/weekly', label: 'Weekly Recap', Icon: Newspaper },
  ]},
  { group: 'Settings', items: [
    { to: '/connect-brokerage', label: 'Brokerage', Icon: Link2 },
    { to: '/alerts', label: 'Alerts', Icon: Bell },
    { to: '/settings', label: 'Configuration', Icon: Settings },
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
            {items.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [styles.link, isActive ? styles.active : ''].join(' ')
                }
              >
                <span className={styles.linkIcon}>
                  <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
                </span>
                <span className={styles.linkLabel}>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        {isLoggedIn ? (
          <button onClick={logout} className={styles.link}>
            <span className={styles.linkIcon}>
              <LogOut size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </span>
            <span className={styles.linkLabel}>Log out</span>
          </button>
        ) : (
          <NavLink to="/signup" className={[styles.link, styles.ctaLink].join(' ')}>
            <span className={styles.linkIcon}>
              <ArrowRight size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            </span>
            <span className={styles.linkLabel}>Get Started</span>
          </NavLink>
        )}
        <div className={styles.themeRow}>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
