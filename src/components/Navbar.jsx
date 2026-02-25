import { NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/scoreboard', label: 'Scoreboard' },
  { to: '/simulator', label: 'Simulator' },
  { to: '/weekly', label: 'Weekly' },
  { to: '/methodology', label: 'Methodology' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span>AI Market Oracle</span>
        </NavLink>
        <ul className={styles.links}>
          {links.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [styles.link, isActive ? styles.active : ''].join(' ')
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
