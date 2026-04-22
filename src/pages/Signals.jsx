import { useState, useEffect } from 'react'
import {
  loadPredictions,
  getTodayDate,
  MODEL_NAMES,
  MODEL_COLORS,
  loadTodaysWinner,
} from '../data/useData'
import styles from './Signals.module.css'

export default function Signals() {
  const [signals, setSignals] = useState([])
  const [consensus, setConsensus] = useState(null)
  const [filter, setFilter] = useState('all') // all | stock | crypto
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const today = getTodayDate()
        const [winner, ...predResults] = await Promise.all([
          loadTodaysWinner().catch(() => null),
          ...MODEL_NAMES.map(m => loadPredictions(today, m).catch(() => null)),
        ])
        setConsensus(winner)

        const all = predResults
          .filter(Boolean)
          .flatMap(p => p.predictions.map(pred => ({
            ...pred,
            model: p.model_display_name,
            context: p.market_context,
          })))
        setSignals(all)
      } catch {
        // data may not exist
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Group signals by ticker
  const grouped = signals.reduce((acc, s) => {
    if (!acc[s.ticker]) acc[s.ticker] = []
    acc[s.ticker].push(s)
    return acc
  }, {})

  const filteredTickers = Object.keys(grouped).filter(ticker => {
    if (filter === 'all') return true
    if (filter === 'crypto') return ticker.endsWith('-USD')
    return !ticker.endsWith('-USD')
  })

  return (
    <div className="animate-in">
      <h1 className={styles.title}>Trade Signals</h1>
      <p className={styles.sub}>Today&apos;s AI predictions across all models. Signals grouped by ticker for consensus analysis.</p>

      {/* Filters */}
      <div className={styles.filters}>
        {['all', 'stock', 'crypto'].map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'stock' ? 'Stocks' : 'Crypto'}
          </button>
        ))}
        <span className={styles.signalCount}>
          {filteredTickers.length} ticker{filteredTickers.length !== 1 ? 's' : ''} · {signals.length} signals
        </span>
      </div>

      {loading ? (
        <div className={`${styles.tickerGrid} stagger`}>
          {[1, 2, 3].map(i => (
            <div key={i} className={`${styles.tickerCard} skeleton`} style={{ height: 180 }} />
          ))}
        </div>
      ) : filteredTickers.length === 0 ? (
        <div className={styles.empty}>
          No signals yet today. Predictions are generated at 8:30 AM ET.
        </div>
      ) : (
        <div className={`${styles.tickerGrid} stagger`}>
          {filteredTickers.map(ticker => {
            const preds = grouped[ticker]
            const upCount = preds.filter(p => p.direction === 'up').length
            const downCount = preds.length - upCount
            const majorityDir = upCount >= downCount ? 'up' : 'down'
            const avgConf = preds.reduce((s, p) => s + p.confidence, 0) / preds.length
            const avgTarget = preds.reduce((s, p) => s + p.target_price, 0) / preds.length
            const isConsensus = consensus?.winner?.ticker === ticker

            return (
              <div key={ticker} className={`${styles.tickerCard} ${isConsensus ? styles.consensusCard : ''}`}>
                {isConsensus && <span className={styles.consensusBadge}>Consensus Pick</span>}
                <div className={styles.tickerHeader}>
                  <span className={styles.tickerName}>{ticker}</span>
                  <span className={`${styles.tickerDir} ${majorityDir === 'up' ? styles.up : styles.down}`}>
                    {majorityDir === 'up' ? '↑' : '↓'} {majorityDir.toUpperCase()}
                  </span>
                </div>

                <div className={styles.tickerMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Avg Target</span>
                    <span className={styles.metaValue}>
                      ${avgTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Avg Confidence</span>
                    <span className={styles.metaValue}>{(avgConf * 100).toFixed(0)}%</span>
                  </div>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Agreement</span>
                    <span className={styles.metaValue}>
                      {Math.max(upCount, downCount)}/{preds.length}
                    </span>
                  </div>
                </div>

                <div className={styles.modelBreakdown}>
                  {preds.map(p => (
                    <div key={p.id} className={styles.modelRow}>
                      <span className={styles.modelDot} style={{ background: MODEL_COLORS[p.model] }} />
                      <span className={styles.modelName}>{p.model}</span>
                      <span className={`${styles.modelDir} ${p.direction === 'up' ? styles.up : styles.down}`}>
                        {p.direction === 'up' ? '↑' : '↓'}
                      </span>
                      <span className={styles.modelTarget}>
                        ${p.target_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className={styles.modelConf}>{(p.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
