import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import PredictionCard from '../components/PredictionCard'
import LeaderboardTable from '../components/LeaderboardTable'
import ConsensusHighlight from '../components/ConsensusHighlight'
import { loadLeaderboard, loadPredictions, loadScores, loadDailySummary, MODEL_NAMES } from '../data/useData'
import styles from './Home.module.css'

const SEED_DATE = '2025-02-19'

export default function Home() {
  const [leaderboard, setLeaderboard] = useState(null)
  const [predictions, setPredictions] = useState({})
  const [scores, setScores] = useState(null)
  const [dailySummary, setDailySummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [lb, sc, ds] = await Promise.all([
          loadLeaderboard(),
          loadScores(SEED_DATE).catch(() => null),
          loadDailySummary(SEED_DATE).catch(() => null),
        ])
        setLeaderboard(lb)
        setScores(sc)
        setDailySummary(ds)

        const predsMap = {}
        await Promise.all(
          MODEL_NAMES.map(async name => {
            try {
              const p = await loadPredictions(SEED_DATE, name)
              predsMap[name] = p
            } catch {}
          })
        )
        setPredictions(predsMap)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className={styles.loading}>Loading...</div>

  const scoreMap = {}
  scores?.results?.forEach(r => { scoreMap[r.prediction_id] = r })

  const models = leaderboard?.models ?? []

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.title}>AI Market Oracle</h1>
        <p className={styles.tagline}>
          Which AI sees the market clearest? A daily experiment — five models, real predictions, real scores.
        </p>
        {dailySummary && (
          <div className={styles.dailyHeadline}>
            <span className={styles.datePill}>{SEED_DATE}</span>
            <span className={styles.headlineText}>{dailySummary.headline}</span>
          </div>
        )}
      </section>

      <div className={styles.grid}>
        {/* Left column */}
        <div className={styles.left}>
          {/* Today's predictions */}
          <section>
            <h2 className={styles.sectionTitle}>Today's Predictions</h2>
            <p className={styles.sectionSub}>
              All models received the same prompt. Scored after market close.
            </p>
            <div className={styles.modelSections}>
              {models.map(model => {
                const key = model.model_display_name.toLowerCase().replace('-', '').replace('gpt4o', 'gpt4o').replace(' ', '')
                const slug = model.model_display_name === 'GPT-4o' ? 'gpt4o'
                  : model.model_display_name.toLowerCase()
                const predData = predictions[slug]
                if (!predData) return null
                return (
                  <div key={model.model_display_name} className={styles.modelSection}>
                    <div className={styles.modelHeader}>
                      <span className={styles.modelDot} style={{ background: model.color }} />
                      <NavLink
                        to={`/model/${model.model_display_name.toLowerCase()}`}
                        className={styles.modelName}
                      >
                        {model.model_display_name}
                      </NavLink>
                      <span className={styles.modelContext}>{predData.market_context?.slice(0, 80)}…</span>
                    </div>
                    <div className={styles.cardGrid}>
                      {predData.predictions.slice(0, 3).map(pred => (
                        <PredictionCard
                          key={pred.id}
                          prediction={pred}
                          score={scoreMap[pred.id]}
                        />
                      ))}
                    </div>
                    {predData.predictions.length > 3 && (
                      <NavLink
                        to={`/model/${model.model_display_name.toLowerCase()}`}
                        className={styles.viewAll}
                      >
                        View all {predData.predictions.length} predictions →
                      </NavLink>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className={styles.right}>
          {/* Leaderboard */}
          <section>
            <div className={styles.sectionHeaderRow}>
              <h2 className={styles.sectionTitle}>Leaderboard</h2>
              <NavLink to="/scoreboard" className={styles.viewAllLink}>Full board →</NavLink>
            </div>
            <LeaderboardTable models={models} compact />
          </section>

          {/* Consensus */}
          {dailySummary?.consensus_picks?.length > 0 && (
            <section>
              <h2 className={styles.sectionTitle}>Today's Consensus</h2>
              <ConsensusHighlight consensus={dailySummary.consensus_picks} />
            </section>
          )}

          {/* Notable calls */}
          {dailySummary && (
            <section>
              <h2 className={styles.sectionTitle}>Notable Calls</h2>
              <div className={styles.notableGrid}>
                {dailySummary.best_call && (
                  <div className={[styles.notable, styles.notableBest].join(' ')}>
                    <span className={styles.notableLabel}>Best Call</span>
                    <div className={styles.notableBody}>
                      <span className={styles.notableModel}>{dailySummary.best_call.model_display_name}</span>
                      <span className={['mono', styles.notableTicker].join(' ')}>{dailySummary.best_call.ticker}</span>
                      <span className={['mono', styles.notableScore].join(' ')}>
                        +{dailySummary.best_call.score.toFixed(2)} pts
                      </span>
                    </div>
                    <p className={styles.notableSummary}>{dailySummary.best_call.summary}</p>
                  </div>
                )}
                {dailySummary.worst_call && (
                  <div className={[styles.notable, styles.notableWorst].join(' ')}>
                    <span className={styles.notableLabel}>Worst Call</span>
                    <div className={styles.notableBody}>
                      <span className={styles.notableModel}>{dailySummary.worst_call.model_display_name}</span>
                      <span className={['mono', styles.notableTicker].join(' ')}>{dailySummary.worst_call.ticker}</span>
                      <span className={['mono', styles.notableScoreNeg].join(' ')}>
                        {dailySummary.worst_call.score.toFixed(2)} pts
                      </span>
                    </div>
                    <p className={styles.notableSummary}>{dailySummary.worst_call.summary}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
