import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { MODEL_COLORS } from '../data/useData'
import styles from './Settings.module.css'

const MODELS = [
  { key: 'claude', name: 'Claude', color: MODEL_COLORS['Claude'] },
  { key: 'gpt4o', name: 'GPT-4o', color: MODEL_COLORS['GPT-4o'] },
  { key: 'grok', name: 'Grok', color: MODEL_COLORS['Grok'] },
  { key: 'perplexity', name: 'Perplexity', color: MODEL_COLORS['Perplexity'] },
  { key: 'gemini', name: 'Gemini', color: MODEL_COLORS['Gemini'] },
]

export default function Settings() {
  const { user, preferences, updatePreferences, brokerageConnected, logout } = useAuth()
  const [modelToggles, setModelToggles] = useState({
    claude: true,
    gpt4o: true,
    grok: true,
    perplexity: true,
    gemini: true,
  })
  const [consensusThreshold, setConsensusThreshold] = useState(3)

  const toggleModel = (key) => {
    setModelToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const activeCount = Object.values(modelToggles).filter(Boolean).length

  return (
    <div className="animate-in">
      <h1 className={styles.title}>Configuration</h1>
      <p className={styles.sub}>Model selection, consensus threshold, and trading preferences.</p>

      <div className={styles.sections}>
        {/* Account */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{user?.email || '—'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Brokerage</span>
              <span className={styles.rowValue}>
                {brokerageConnected ? (
                  <span className={styles.connectedTag}>Connected</span>
                ) : (
                  <Link to="/connect-brokerage" className={styles.linkAction}>Connect →</Link>
                )}
              </span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Plan</span>
              <span className={styles.rowValue}>
                <span className={styles.planBadge}>Pro</span>
              </span>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Active Models</h2>
          <p className={styles.sectionDesc}>
            Choose which AI models contribute to consensus signals. {activeCount}/5 active.
          </p>
          <div className={styles.card}>
            {MODELS.map(m => (
              <div key={m.key} className={styles.modelRow}>
                <span className={styles.modelDot} style={{ background: m.color }} />
                <span className={styles.modelName}>{m.name}</span>
                <button
                  className={`${styles.toggle} ${modelToggles[m.key] ? styles.toggleOn : ''}`}
                  onClick={() => toggleModel(m.key)}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Consensus Threshold */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Consensus Threshold</h2>
          <p className={styles.sectionDesc}>
            Minimum models that must agree before triggering a signal. Currently: {consensusThreshold}/{activeCount}
          </p>
          <div className={styles.card}>
            <div className={styles.sliderRow}>
              <input
                type="range"
                min="2"
                max={activeCount}
                value={consensusThreshold}
                onChange={e => setConsensusThreshold(Number(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.sliderLabel}>{consensusThreshold} models</span>
            </div>
            <div className={styles.thresholdBar}>
              {Array.from({ length: activeCount }, (_, i) => (
                <span
                  key={i}
                  className={`${styles.thresholdDot} ${i < consensusThreshold ? styles.thresholdActive : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Trading Preferences</h2>
          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Account Size</span>
              <span className={styles.rowValue}>{preferences?.accountSize || '—'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Risk Tolerance</span>
              <span className={styles.rowValue}>{preferences?.riskTolerance || '—'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Sectors</span>
              <span className={styles.rowValue}>{preferences?.sectors?.join(', ') || '—'}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Frequency</span>
              <select
                value={preferences?.frequency || 'daily'}
                onChange={e => updatePreferences({ frequency: e.target.value })}
                className={styles.select}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="realtime">Real-time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={styles.section}>
          <h2 className={`${styles.sectionTitle} ${styles.danger}`}>Danger Zone</h2>
          <div className={styles.dangerCard}>
            <div className={styles.dangerRow}>
              <div>
                <span className={styles.dangerLabel}>Sign Out</span>
                <span className={styles.dangerDesc}>Log out of your Oracle Trade account</span>
              </div>
              <button className={styles.dangerBtn} onClick={logout}>Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
