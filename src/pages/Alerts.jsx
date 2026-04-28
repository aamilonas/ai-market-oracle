import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import styles from './Alerts.module.css'

const MOCK_ALERTS = [
  { id: 1, type: 'signal', time: '8:31 AM', title: 'New Consensus Signal', body: 'NVDA — 3/5 models agree: ↑ UP to $205.33', read: false },
  { id: 2, type: 'trade', time: '9:30 AM', title: 'Trade Executed', body: 'Bought NVDA at $202.01 — Position Size: 5%', read: false },
  { id: 3, type: 'score', time: '4:01 PM', title: 'Daily Scores In', body: 'GPT-4o led with 81.4% accuracy today. View leaderboard.', read: true },
  { id: 4, type: 'signal', time: 'Yesterday', title: 'High Conviction Alert', body: 'BTC-USD — 4/5 models agree: ↑ UP. Confidence: 72%', read: true },
  { id: 5, type: 'system', time: 'Apr 19', title: 'Weekly Recap Available', body: 'Week 16 summary is ready. GPT-4o topped the leaderboard.', read: true },
  { id: 6, type: 'trade', time: 'Apr 18', title: 'Trade Closed', body: 'Sold TSLA at $392.50 — Result: WIN (+1.05 score)', read: true },
]

const NOTIFICATION_SETTINGS = [
  { key: 'consensus', label: 'Consensus Signals', desc: 'When 4+ models agree on a direction' },
  { key: 'highConviction', label: 'High Conviction Alerts', desc: 'When 4+ models agree with >70% confidence' },
  { key: 'tradeExecution', label: 'Trade Executions', desc: 'When auto-trade places or closes a position' },
  { key: 'dailyScores', label: 'Daily Score Reports', desc: 'Evening summary of model performance' },
  { key: 'weeklyRecap', label: 'Weekly Recaps', desc: 'Saturday digest of the week\'s predictions' },
]

export default function Alerts() {
  const { brokerageConnected } = useAuth()
  const [notifSettings, setNotifSettings] = useState({
    consensus: true,
    highConviction: true,
    tradeExecution: true,
    dailyScores: false,
    weeklyRecap: true,
  })
  const [alerts] = useState(MOCK_ALERTS)

  const toggleNotif = (key) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const typeIcon = (type) => {
    switch (type) {
      case 'signal': return '◆'
      case 'trade': return '⇄'
      case 'score': return '★'
      case 'system': return '●'
      default: return '○'
    }
  }

  const typeColor = (type) => {
    switch (type) {
      case 'signal': return 'var(--accent-primary)'
      case 'trade': return 'var(--positive)'
      case 'score': return 'var(--warning, #eab308)'
      case 'system': return 'var(--text-tertiary)'
      default: return 'var(--text-tertiary)'
    }
  }

  return (
    <div className="animate-in">
      <h1 className={styles.title}>Alerts</h1>
      <p className={styles.sub}>Trade signal notifications and system alerts.</p>

      <div className={styles.twoCol}>
        {/* Alert Feed */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Recent Alerts</span>
            <span className={styles.unreadBadge}>
              {alerts.filter(a => !a.read).length} unread
            </span>
          </div>
          <div className={styles.alertList}>
            {alerts.map(a => (
              <div key={a.id} className={`${styles.alertRow} ${!a.read ? styles.unread : ''}`}>
                <span className={styles.alertIcon} style={{ color: typeColor(a.type) }}>
                  {typeIcon(a.type)}
                </span>
                <div className={styles.alertContent}>
                  <div className={styles.alertTop}>
                    <span className={styles.alertTitle}>{a.title}</span>
                    <span className={styles.alertTime}>{a.time}</span>
                  </div>
                  <p className={styles.alertBody}>{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Notification Settings</span>
          </div>
          <div className={styles.notifList}>
            {NOTIFICATION_SETTINGS.map(ns => (
              <div key={ns.key} className={styles.notifRow}>
                <div className={styles.notifInfo}>
                  <span className={styles.notifLabel}>{ns.label}</span>
                  <span className={styles.notifDesc}>{ns.desc}</span>
                </div>
                <button
                  className={`${styles.toggle} ${notifSettings[ns.key] ? styles.toggleOn : ''}`}
                  onClick={() => toggleNotif(ns.key)}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            ))}
          </div>

          {!brokerageConnected && (
            <div className={styles.notifNote}>
              Connect a brokerage to enable trade execution alerts.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
