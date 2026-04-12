import { useState, useEffect } from 'react'
import WeeklySummary from '../components/WeeklySummary'
import { loadWeeklySummary, loadWeeksIndex, loadLeaderboard } from '../data/useData'
import styles from './Weekly.module.css'

export default function Weekly() {
  const [weeks, setWeeks] = useState([])
  const [selected, setSelected] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      loadWeeksIndex().catch(() => []),
      loadLeaderboard().catch(() => null),
    ])
      .then(([list, lb]) => {
        const sorted = [...list].sort().reverse()
        setWeeks(sorted)
        setSelected(sorted[0] || null)
        setLeaderboard(lb)
      })
  }, [])

  useEffect(() => {
    if (!selected) { setLoading(false); return }
    setLoading(true)
    loadWeeklySummary(selected)
      .then(setWeekly)
      .catch(() => setWeekly(null))
      .finally(() => setLoading(false))
  }, [selected])

  const liveWeekScores = leaderboard?.models
    ?.map(model => {
      const weekScore = model.weekly_scores?.find(entry => entry.week === selected)
      if (!weekScore) return null
      return {
        model: model.model_display_name,
        weekly_score: weekScore.score,
        predictions: weekScore.predictions,
        accuracy: weekScore.accuracy,
      }
    })
    .filter(Boolean)

  const weekScores = liveWeekScores?.length ? liveWeekScores : weekly?.scores

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Weekly Report</h1>
          <p className={styles.sub}>AI-generated recap of each week&apos;s predictions, scores, and highlights.</p>
        </div>
        {weeks.length > 0 && (
          <select
            className={styles.picker}
            value={selected || ''}
            onChange={e => setSelected(e.target.value)}
          >
            {weeks.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        )}
      </div>

      {loading && <div className={styles.loading}>Loading weekly report...</div>}
      {!loading && weekly && <WeeklySummary weekly={weekly} />}
      {!loading && !weekly && (
        <div className={styles.empty}>
          {selected ? `No report available for ${selected} yet.` : 'No weekly reports available yet.'}
        </div>
      )}

      {!loading && weekScores?.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Week Scores</h2>
          <div className={styles.scoreTable}>
            {[...weekScores].sort((a, b) => b.weekly_score - a.weekly_score).map((s, i) => (
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
                {typeof s.rank_change === 'number' && s.rank_change !== 0 && (
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
