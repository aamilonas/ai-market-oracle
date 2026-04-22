import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import {
  loadTodaysWinner,
  loadSimulator,
  getTodayDate,
  MODEL_NAMES,
  MODEL_COLORS,
  loadPredictions,
} from '../data/useData'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user } = useAuth()
  const [winner, setWinner] = useState(null)
  const [sim, setSim] = useState(null)
  const [todaySignals, setTodaySignals] = useState([])
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    async function load() {
      try {
        const [w, s] = await Promise.all([
          loadTodaysWinner().catch(() => null),
          loadSimulator().catch(() => null),
        ])
        setWinner(w)
        setSim(s)

        const today = getTodayDate()
        const preds = await Promise.allSettled(
          MODEL_NAMES.map(m => loadPredictions(today, m))
        )
        const allSignals = preds
          .filter(p => p.status === 'fulfilled')
          .flatMap(p => p.value.predictions.map(pred => ({
            ...pred,
            model: p.value.model_display_name,
          })))
        setTodaySignals(allSignals)
      } catch {
        // data may not exist yet
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const balance = sim?.balance || 0
  const startingBalance = sim?.starting_balance || 25000
  const totalPnl = balance - startingBalance
  const closedTrades = sim?.trades?.filter(t => t.status === 'CLOSED') || []
  const wins = closedTrades.filter(t => t.pnl > 0).length
  const winRate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0

  if (loading) {
    return (
      <div className="animate-in">
        <h1 className={styles.title}>{greeting}{user ? `, ${user.name}` : ''}</h1>
        <div className={styles.statsRow}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)', flex: 1 }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      <h1 className={styles.title}>{greeting}{user ? `, ${user.name}` : ''}</h1>

      {/* Portfolio Summary */}
      <div className={styles.statsRow}>
        <Link to="/portfolio" className={styles.statItem}>
          <span className={styles.statLabel}>Balance</span>
          <span className={styles.statValue} style={{ color: totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </Link>
        <Link to="/portfolio" className={styles.statItem}>
          <span className={styles.statLabel}>P&L</span>
          <span className={styles.statValue} style={{ color: totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString()}
          </span>
        </Link>
        <Link to="/portfolio" className={styles.statItem}>
          <span className={styles.statLabel}>Win Rate</span>
          <span className={styles.statValue} style={{ color: winRate >= 50 ? 'var(--positive)' : 'var(--negative)' }}>
            {winRate}%
          </span>
        </Link>
      </div>

      {/* Consensus Signal Hero */}
      {winner?.winner && (
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <span className={styles.heroLabel}>Today&apos;s Consensus Signal</span>
            <span className={styles.heroBadge}>
              {winner.winner.model_count} / 5 Models Agree
            </span>
          </div>
          <div className={styles.heroBody}>
            <div className={styles.heroTicker}>
              <span className={styles.tickerName}>{winner.winner.ticker}</span>
              <span className={`${styles.directionBadge} ${winner.winner.direction === 'up' ? styles.up : styles.down}`}>
                {winner.winner.direction === 'up' ? '↑' : '↓'} {winner.winner.direction.toUpperCase()}
              </span>
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaLabel}>Entry</span>
                <span className={styles.heroMetaValue}>${winner.winner.avg_entry?.toFixed(2)}</span>
              </div>
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaLabel}>Target</span>
                <span className={styles.heroMetaValue}>${winner.winner.avg_target?.toFixed(2)}</span>
              </div>
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaLabel}>Expected Move</span>
                <span className={styles.heroMetaValue} style={{ color: winner.winner.direction === 'up' ? 'var(--positive)' : 'var(--negative)' }}>
                  {winner.winner.direction === 'up' ? '+' : ''}{winner.winner.expected_move_pct?.toFixed(2)}%
                </span>
              </div>
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaLabel}>Confidence</span>
                <span className={styles.heroMetaValue}>{(winner.winner.avg_confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className={styles.heroModels}>
              {winner.winner.models?.map(m => (
                <span key={m} className={styles.modelChip} style={{ borderColor: MODEL_COLORS[m], color: MODEL_COLORS[m] }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Today's Signals */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Today&apos;s Signals</span>
          <Link to="/signals" className={styles.panelLink}>View All →</Link>
        </div>
        {todaySignals.length === 0 ? (
          <p className={styles.emptyState}>No signals yet today. Check back after 8:30 AM ET.</p>
        ) : (
          <div className={styles.signalList}>
            {todaySignals.slice(0, 10).map(s => (
              <div key={s.id} className={styles.signalRow}>
                <span className={styles.signalTicker}>{s.ticker}</span>
                <span className={`${styles.signalDir} ${s.direction === 'up' ? styles.up : styles.down}`}>
                  {s.direction === 'up' ? '↑' : '↓'}
                </span>
                <span className={styles.signalTarget}>
                  ${s.target_price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
                <span className={styles.signalConf}>{(s.confidence * 100).toFixed(0)}%</span>
                <span className={styles.signalModel} style={{ color: MODEL_COLORS[s.model] }}>
                  {s.model}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
