import { useState, useEffect } from 'react'
import LeaderboardTable from '../components/LeaderboardTable'
import ScoreChart from '../components/ScoreChart'
import { loadLeaderboard, loadAnalytics, enrichModelsWithColors } from '../data/useData'
import styles from './Scoreboard.module.css'

export default function Scoreboard() {
  const [leaderboard, setLeaderboard] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      loadLeaderboard(),
      loadAnalytics().catch(() => null),
    ]).then(([lb, an]) => {
      setLeaderboard(lb)
      setAnalytics(an)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!leaderboard) return null

  const models = enrichModelsWithColors(leaderboard.models)
  const weeks = [...new Set(models.flatMap(model => model.weekly_scores?.map(w => w.week) ?? []))].sort()

  const headToHead = analytics?.head_to_head?.recent_clashes ?? []

  return (
    <div className={styles.page}>
      <div className={styles.heroRow}>
        <div>
          <h1 className={styles.title}>Scoreboard</h1>
          <p className={styles.sub}>
            Updated after market close each weekday. Scores weighted by confidence.
          </p>
        </div>
        <span className={styles.updated}>
          Last updated: {new Date(leaderboard.last_updated).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York'
          })} ET
        </span>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>Full Leaderboard</h2>
        <LeaderboardTable models={models} />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Cumulative Score Over Time</h2>
        <div className={styles.chart}>
          <ScoreChart models={models} />
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Weekly Breakdown</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Model</th>
                {weeks.map(week => (
                  <th key={week} className={styles.th}>{week}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map(model => (
                <tr key={model.model_display_name} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.modelCell}>
                      <span className={styles.modelDot} style={{ background: model.color }} />
                      <span className={styles.modelName}>{model.model_display_name}</span>
                    </div>
                  </td>
                  {weeks.map(week => {
                    const w = model.weekly_scores?.find(entry => entry.week === week)
                    return (
                      <td key={week} className={styles.td}>
                        {w ? (
                          <span className={['mono', w.score >= 0 ? styles.pos : styles.neg].join(' ')}>
                            {w.score >= 0 ? '+' : ''}{w.score.toFixed(1)}
                          </span>
                        ) : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {headToHead.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Head-to-Head</h2>
          <p className={styles.sectionSub}>Same ticker, same day — who called it right?</p>
          <div className={styles.h2hList}>
            {headToHead.map((h, i) => (
              <div key={i} className={styles.h2hCard}>
                <div className={styles.h2hHeader}>
                  <span className={styles.h2hTicker}>{h.ticker}</span>
                  <span className={styles.h2hDate}>{h.date}</span>
                  <span className={styles.h2hWinner}>Winner: {h.winner}</span>
                </div>
                <div className={styles.h2hModels}>
                  <span className={styles.h2hModel} style={{ color: h.model_a_correct ? '#22c55e' : '#ef4444' }}>
                    {h.model_a} ({h.model_a_direction})
                  </span>
                  <span style={{ color: '#555' }}>vs</span>
                  <span className={styles.h2hModel} style={{ color: h.model_b_correct ? '#22c55e' : '#ef4444' }}>
                    {h.model_b} ({h.model_b_direction})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
