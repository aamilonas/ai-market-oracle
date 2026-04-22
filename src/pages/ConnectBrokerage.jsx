import { useState } from 'react'
import { useAuth } from '../context/useAuth'
import styles from './ConnectBrokerage.module.css'

const BROKERAGES = [
  { name: 'Robinhood', enabled: true, color: '#00C805' },
  { name: 'Charles Schwab', enabled: false, color: '#00A0DF' },
  { name: 'Fidelity', enabled: false, color: '#4C8C2B' },
  { name: 'Webull', enabled: false, color: '#F5A623' },
]

export default function ConnectBrokerage() {
  const { brokerageConnected, connectBrokerage, brokerageSettings, updateBrokerageSettings } = useAuth()
  const [modalStep, setModalStep] = useState(null) // null | 'login' | 'permissions' | 'success'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const startFlow = () => setModalStep('login')

  const handleLogin = (e) => {
    e.preventDefault()
    if (email && password) setModalStep('permissions')
  }

  const handleAuthorize = () => {
    setModalStep('success')
    connectBrokerage()
    setTimeout(() => setModalStep(null), 2500)
  }

  const closeModal = () => setModalStep(null)

  return (
    <div className="animate-in">
      <h1 className={styles.title}>Connect Brokerage</h1>
      <p className={styles.sub}>Link your brokerage account to enable auto-trading.</p>

      {brokerageConnected ? (
        <div className={styles.connectedSection}>
          <div className={styles.connectedHeader}>
            <span className={styles.connectedDot} />
            <span>Robinhood Connected</span>
          </div>

          <div className={styles.settingsGrid}>
            <div className={styles.settingCard}>
              <span className={styles.settingLabel}>Account Balance</span>
              <span className={styles.settingValue}>$25,000.00</span>
            </div>

            <div className={styles.settingCard}>
              <span className={styles.settingLabel}>Auto-Trade</span>
              <button
                className={`${styles.toggle} ${brokerageSettings.autoTrade ? styles.toggleOn : ''}`}
                onClick={() => updateBrokerageSettings({ autoTrade: !brokerageSettings.autoTrade })}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.settingCard}>
              <span className={styles.settingLabel}>Position Size</span>
              <div className={styles.sliderWrap}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={brokerageSettings.positionSize}
                  onChange={e => updateBrokerageSettings({ positionSize: Number(e.target.value) })}
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>{brokerageSettings.positionSize}%</span>
              </div>
            </div>

            <div className={styles.settingCard}>
              <span className={styles.settingLabel}>Max Daily Trades</span>
              <select
                value={brokerageSettings.maxDailyTrades}
                onChange={e => updateBrokerageSettings({ maxDailyTrades: Number(e.target.value) })}
                className={styles.select}
              >
                {[1, 2, 3, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${styles.brokerageGrid} stagger`}>
          {BROKERAGES.map(b => (
            <button
              key={b.name}
              className={`${styles.brokerageCard} ${!b.enabled ? styles.disabled : ''}`}
              onClick={b.enabled ? startFlow : undefined}
              disabled={!b.enabled}
            >
              <span className={styles.brokerageDot} style={{ background: b.color }} />
              <span className={styles.brokerageName}>{b.name}</span>
              {!b.enabled && <span className={styles.comingSoon}>Coming Soon</span>}
            </button>
          ))}
        </div>
      )}

      {/* Modal Overlay */}
      {modalStep && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            {modalStep === 'login' && (
              <div className="animate-in">
                <div className={styles.modalHeader}>
                  <span className={styles.rhLogo} style={{ color: '#00C805' }}>◆</span>
                  <span className={styles.rhTitle}>Robinhood</span>
                </div>
                <p className={styles.modalSub}>Sign in to connect your account</p>
                <form onSubmit={handleLogin} className={styles.modalForm}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={styles.rhInput}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={styles.rhInput}
                    required
                  />
                  <button type="submit" className={styles.rhBtn}>Sign In</button>
                </form>
              </div>
            )}

            {modalStep === 'permissions' && (
              <div className="animate-slide-right">
                <div className={styles.modalHeader}>
                  <span className={styles.rhLogo} style={{ color: '#00C805' }}>◆</span>
                  <span className={styles.rhTitle}>Authorize Oracle Trade</span>
                </div>
                <p className={styles.modalSub}>Oracle Trade is requesting access to your account</p>
                <ul className={styles.permList}>
                  <li><span className={styles.permCheck}>&#10003;</span> View account balance and positions</li>
                  <li><span className={styles.permCheck}>&#10003;</span> Place buy and sell orders</li>
                  <li><span className={styles.permCheck}>&#10003;</span> View trade history</li>
                  <li><span className={styles.permCheck}>&#10003;</span> Receive real-time quotes</li>
                </ul>
                <div className={styles.modalActions}>
                  <button onClick={closeModal} className={styles.rhBtnGhost}>Cancel</button>
                  <button onClick={handleAuthorize} className={styles.rhBtn}>Authorize</button>
                </div>
              </div>
            )}

            {modalStep === 'success' && (
              <div className="animate-scale" style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
                <div className={styles.successCheck}>&#10003;</div>
                <h3 className={styles.successTitle}>Connected!</h3>
                <p className={styles.successSub}>Your Robinhood account is linked.</p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
