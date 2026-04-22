import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import styles from './Layout.module.css'

const FULL_WIDTH_ROUTES = ['/', '/signup', '/onboarding']

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const isFullWidth = FULL_WIDTH_ROUTES.includes(pathname)

  if (isFullWidth) {
    return <div className={styles.fullWidth}>{children}</div>
  }

  return (
    <div className={styles.root}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
        <footer className={styles.footer}>
          <span className="mono">Oracle Trade</span>
          <span>Prototype — Not financial advice</span>
        </footer>
      </main>
    </div>
  )
}
