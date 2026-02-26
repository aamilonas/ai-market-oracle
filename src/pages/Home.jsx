import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import PredictionCard from '../components/PredictionCard'
import LeaderboardTable from '../components/LeaderboardTable'
import ConsensusHighlight from '../components/ConsensusHighlight'
import TodaysWinner from '../components/TodaysWinner'
import { loadLeaderboard, loadPredictions, loadScores, loadDailySummary, loadTodaysWinner, MODEL_NAMES, MODEL_DISPLAY_MAP, MODEL_COLORS, getTodayDate } from '../data/useData'
import styles from './Home.module.css'

const EXCLUDED_TICKERS = new Set(['SPY', 'QQQ', 'DIA', 'VIX', 'IWM'])

function computeWinner(predictionsMap) {
  const groups = {}
  for (const [, data] of Object.entries(predictionsMap)) {
    const modelName = data.model_display_name
    for (const pred of data.predictions || []) {
      if (EXCLUDED_TICKERS.has(pred.ticker)) continue
      if (pred.ticker?.endsWith('-USD')) continue
      if (!pred.target_price || !pred.current_price_at_prediction) continue
      const key = `${pred.ticker}|${pred.direction}`
      if (!groups[key]) groups[key] = []
      groups[key].push({ model: modelName, confidence: pred.confidence, target: pred.target_price, entry: pred.current_price_at_prediction })
    }
  }
  let best = null
  for (const [key, picks] of Object.entries(groups)) {
    if (picks.length < 3) continue
    const [ticker, direction] = key.split('|')
    const avgConf = picks.reduce((s, p) => s + p.confidence, 0) / picks.length
    const avgTarget = picks.reduce((s, p) => s + p.target, 0) / picks.length
    const avgEntry = picks.reduce((s, p) => s + p.entry, 0) / picks.length
    if (avgEntry === 0) continue
    const movePct = Math.abs((avgTarget - avgEntry) / avgEntry * 100)
    const score = avgConf * movePct
    const candidate = {
      ticker, direction,
      avg_confidence: Math.round(avgConf * 10000) / 10000,
      avg_target: Math.round(avgTarget * 100) / 100,
      avg_entry: Math.round(avgEntry * 100) / 100,
      expected_move_pct: Math.round(movePct * 100) / 100,
      score: Math.round(score * 10000) / 10000,
      models: picks.map(p => p.model),
      model_count: picks.length,
      high_conviction: avgConf >= 0.85,
    }
    if (!best || candidate.score > best.score) best = candidate
  }
  return best
}

function resolveWinner(todaysWinner, predictions) {
  if (todaysWinner?.winner) return todaysWinner.winner
  if (Object.keys(predictions).length > 0) return computeWinner(predictions)
  return null
}

export default function Home() {
  const [leaderboard, setLeaderboard] = useState(null)
  const [predictions, setPredictions] = useState({})
  const [scores, setScores] = useState(null)
  const [dailySummary, setDailySummary] = useState(null)
  const [todaysWinner, setTodaysWinner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [horizontal, setHorizontal] = useState(() => {
    try { return localStorage.getItem('layout') === 'horizontal' } catch { return false }
  })

  const today = getTodayDate()

  useEffect(() => {
    async function load() {
      try {
        const [lb, sc, ds, tw] = await Promise.all([
          loadLeaderboard(),
          loadScores(today).catch(() => null),
          loadDailySummary(today).catch(() => null),
          loadTodaysWinner().catch(() => null),
        ])
        setLeaderboard(lb)
        setScores(sc)
        setDailySummary(ds)
        setTodaysWinner(tw)

        const predsMap = {}
        await Promise.all(
          MODEL_NAMES.map(async name => {
            try {
              const p = await loadPredictions(today, name)
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
            <span className={styles.datePill}>{today}</span>
            <span className={styles.headlineText}>{dailySummary.headline}</span>
          </div>
        )}
      </section>

      {/* Today's Winner */}
      <TodaysWinner winner={resolveWinner(todaysWinner, predictions)} />

      {/* Layout toggle */}
      {(() => {
        const toggleBtn = (
          <button
            className={styles.layoutToggle}
            onClick={() => {
              const next = !horizontal
              setHorizontal(next)
              try { localStorage.setItem('layout', next ? 'horizontal' : 'vertical') } catch {}
            }}
            aria-label={horizontal ? 'Switch to grid view' : 'Switch to column view'}
          >
            <svg className={!horizontal ? styles.toggleIconActive : styles.toggleIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <svg className={horizontal ? styles.toggleIconActive : styles.toggleIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="6.5" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="12" width="14" height="3" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        )

        const predictionsBlock = (
          <div className={horizontal ? styles.modelSectionsHorizontal : styles.modelSections}>
            {MODEL_NAMES.map(slug => {
              const predData = predictions[slug]
              if (!predData) return null
              const displayName = MODEL_DISPLAY_MAP[slug]
              const color = MODEL_COLORS[displayName]
              return (
                <div key={slug} className={horizontal ? styles.modelSectionHorizontal : styles.modelSection}>
                  <div className={styles.modelHeader}>
                    <span className={styles.modelDot} style={{ background: color }} />
                    <NavLink
                      to={`/model/${slug}`}
                      className={styles.modelName}
                    >
                      {displayName}
                    </NavLink>
                    {!horizontal && (
                      <span className={styles.modelContext}>{predData.market_context?.slice(0, 80)}…</span>
                    )}
                  </div>
                  <div className={horizontal ? styles.cardGridHorizontal : styles.cardGrid}>
                    {predData.predictions.slice(0, horizontal ? 7 : 3).map(pred => (
                      <PredictionCard
                        key={pred.id}
                        prediction={pred}
                        score={scoreMap[pred.id]}
                        compact={horizontal}
                      />
                    ))}
                  </div>
                  {!horizontal && predData.predictions.length > 3 && (
                    <NavLink
                      to={`/model/${slug}`}
                      className={styles.viewAll}
                    >
                      View all {predData.predictions.length} predictions →
                    </NavLink>
                  )}
                </div>
              )
            })}
          </div>
        )

        const leaderboardBlock = (
          <section>
            <div className={styles.sectionHeaderRow}>
              <h2 className={styles.sectionTitle}>Leaderboard</h2>
              <NavLink to="/scoreboard" className={styles.viewAllLink}>Full board →</NavLink>
            </div>
            <LeaderboardTable models={models} compact />
          </section>
        )

        const consensusBlock = dailySummary?.consensus_picks?.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Today's Consensus</h2>
            <ConsensusHighlight consensus={dailySummary.consensus_picks} />
          </section>
        )

        const notableBlock = dailySummary && (
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
                      {dailySummary.best_call.score != null ? `+${dailySummary.best_call.score.toFixed(2)} pts` : 'Pending'}
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
                      {dailySummary.worst_call.score != null ? `${dailySummary.worst_call.score.toFixed(2)} pts` : 'Pending'}
                    </span>
                  </div>
                  <p className={styles.notableSummary}>{dailySummary.worst_call.summary}</p>
                </div>
              )}
            </div>
          </section>
        )

        if (horizontal) {
          return (
            <div className={styles.columnLayout}>
              <div className={styles.sectionHeaderRow}>
                <div>
                  <h2 className={styles.sectionTitle}>Today's Predictions</h2>
                  <p className={styles.sectionSub}>
                    All models received the same prompt. Scored after market close.
                  </p>
                </div>
                {toggleBtn}
              </div>
              {leaderboardBlock}
              {predictionsBlock}
              <div className={styles.bottomSidebar}>
                {consensusBlock}
                {notableBlock}
              </div>
            </div>
          )
        }

        return (
          <div className={styles.grid}>
            <div className={styles.left}>
              <section>
                <div className={styles.sectionHeaderRow}>
                  <div>
                    <h2 className={styles.sectionTitle}>Today's Predictions</h2>
                    <p className={styles.sectionSub}>
                      All models received the same prompt. Scored after market close.
                    </p>
                  </div>
                  {toggleBtn}
                </div>
                {predictionsBlock}
              </section>
            </div>
            <div className={styles.right}>
              {leaderboardBlock}
              {consensusBlock}
              {notableBlock}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
