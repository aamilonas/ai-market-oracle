import { useState, useEffect } from 'react'
import LeaderboardTable from '../components/LeaderboardTable'
import ScoreChart from '../components/ScoreChart'
import { loadLeaderboard } from '../data/useData'
import styles from './Scoreboard.module.css'

export default function Scoreboard() {
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard().then(setLeaderboard).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!leaderboard) return null

  const models = leaderboard.models

  // Head-to-head: find pairs who both predicted the same ticker on the same day
  // For demo, derived from seed data
  const headToHead = [
    { ticker: 'TSLA', date: '2025-02-19', models: ['GPT-4o', 'Grok'], winner: 'GPT-4o', note: 'GPT-4o called down (correct), Grok called up (wrong). Tesla fell 2.1%.' },
    { ticker: 'NVDA', date: '2025-02-19', models: ['Claude', 'Perplexity', 'Grok'], winner: 'All correct', note: 'All three called NVDA up. Stock rose 1.2%. Direction correct, targets were aggressive.' },
    { ticker: 'SPY', date: '2025-02-19', models: ['Claude', 'Perplexity', 'Gemini', 'GPT-4o', 'Grok'], winner: 'Claude', note: 'Only Claude correctly called SPY down. All others predicted a bounce that didn\'t come.' },
  ]

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
                {models[0]?.weekly_scores?.map(w => (
                  <th key={w.week} className={styles.th}>{w.week.replace('2025-', '')}</th>
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
                  {model.weekly_scores?.map(w => (
                    <td key={w.week} className={styles.td}>
                      <span className={['mono', w.score >= 0 ? styles.pos : styles.neg].join(' ')}>
                        {w.score >= 0 ? '+' : ''}{w.score.toFixed(1)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
              <p className={styles.h2hNote}>{h.note}</p>
              <div className={styles.h2hModels}>
                {h.models.map(m => (
                  <span key={m} className={styles.h2hModel}>{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
