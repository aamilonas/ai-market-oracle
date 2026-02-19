import { useState, useEffect } from 'react'
import WeeklySummary from '../components/WeeklySummary'
import { loadWeeklySummary } from '../data/useData'
import styles from './Weekly.module.css'

const WEEKS = ['2025-W07']

export default function Weekly() {
  const [selected, setSelected] = useState(WEEKS[0])
  const [weekly, setWeekly] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    loadWeeklySummary(selected)
      .then(setWeekly)
      .catch(() => setWeekly(null))
      .finally(() => setLoading(false))
  }, [selected])

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Weekly Report</h1>
          <p className={styles.sub}>AI-generated recap of each week's predictions, scores, and highlights.</p>
        </div>
        <select
          className={styles.picker}
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          {WEEKS.map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {loading && <div className={styles.loading}>Loading weekly report...</div>}
      {!loading && weekly && <WeeklySummary weekly={weekly} />}
      {!loading && !weekly && (
        <div className={styles.empty}>No report available for {selected} yet.</div>
      )}

      {!loading && weekly?.scores && (
        <section>
          <h2 className={styles.sectionTitle}>Week Scores</h2>
          <div className={styles.scoreTable}>
            {[...weekly.scores].sort((a, b) => b.weekly_score - a.weekly_score).map((s, i) => (
              <div key={s.model} className={styles.scoreRow}>
                <span className={styles.scoreRank}>{i + 1}</span>
                <span className={styles.scoreModel}>{s.model}</span>
                <span className={styles.scorePreds}>{s.predictions} predictions</span>
                <span className="mono" style={{ color: '#888', fontSize: '0.8rem' }}>
                  {(s.accuracy * 100).toFixed(0)}% acc
                </span>
                <span className={['mono', s.weekly_score >= 0 ? styles.pos : styles.neg].join(' ')}>
                  {s.weekly_score >= 0 ? '+' : ''}{s.weekly_score.toFixed(1)} pts
                </span>
                {s.rank_change !== 0 && (
                  <span style={{ color: s.rank_change > 0 ? '#22c55e' : '#ef4444', fontSize: '0.75rem' }}>
                    {s.rank_change > 0 ? '↑' : '↓'}{Math.abs(s.rank_change)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
