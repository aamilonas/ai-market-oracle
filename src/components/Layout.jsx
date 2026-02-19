import Navbar from './Navbar'
import styles from './Layout.module.css'

export default function Layout({ children }) {
  return (
    <div className={styles.root}>
      <Navbar />
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            AI Market Oracle — Not financial advice. This is an experiment.
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
          >
            Source on GitHub →
          </a>
        </div>
      </footer>
    </div>
  )
}
