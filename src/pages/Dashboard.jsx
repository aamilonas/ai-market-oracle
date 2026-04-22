import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import {
  loadTodaysWinner,
  loadSimulator,
  getTodayDate,
  MODEL_NAMES,
  MODEL_COLORS,
  loadPredictions,
} from '../data/useData'
import { useCountUp } from '../hooks/useCountUp'
import styles from './Dashboard.module.css'

function Currency({ value, positive }) {
  const animated = useCountUp(Math.abs(value), 700, 2)
  const sign = value < 0 ? '-' : ''
  const className = positive === undefined
    ? styles.statValue
    : positive ? styles.statValuePos : styles.statValueNeg
  return (
    <span className={className}>
      {sign}${animated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

function Percent({ value, positive }) {
  const animated = useCountUp(value, 700, 1)
  const className = positive === undefined
    ? styles.statValue
    : positive ? styles.statValuePos : styles.statValueNeg
  return (
    <span className={className}>
      {positive && value > 0 ? '+' : ''}{animated.toFixed(1)}%
    </span>
  )
}

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
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0
  const pnlPositive = totalPnl >= 0

  if (loading) {
    return (
      <div className="animate-in">
        <h1 className={styles.title}>{greeting}{user ? `, ${user.name}` : ''}</h1>
        <div className={styles.statsRow}>
          {[1, 2, 3].map(i => (
            <div key={i} className={`skeleton ${styles.statSkeleton}`} />
          ))}
        </div>
      </div>
    )
  }

  const w = winner?.winner
  const isUp = w?.direction === 'up'

  return (
    <div className="animate-in">
      <div className={styles.pageHead}>
        <h1 className={styles.title}>{greeting}{user ? `, ${user.name}` : ''}</h1>
        <p className={styles.subtitle}>Here&apos;s what the models see this morning.</p>
      </div>

      {/* Portfolio summary */}
      <div className={styles.statsRow}>
        <Link to="/portfolio" className={styles.statItem}>
          <span className={styles.statLabel}>Balance</span>
          <Currency value={balance} />
        </Link>
        <Link to="/portfolio" className={styles.statItem}>
          <span className={styles.statLabel}>P&amp;L</span>
          <Currency value={totalPnl} positive={pnlPositive} />
        </Link>
        <Link to="/portfolio" className={styles.statItem}>
          <span className={styles.statLabel}>Win rate</span>
          <Percent value={winRate} positive={winRate >= 50} />
        </Link>
      </div>

      {/* Consensus signal — promoted */}
      {w && (
        <div className={styles.heroCard}>
          <div className={styles.heroGlow} aria-hidden />

          <div className={styles.heroTop}>
            <span className={styles.heroLabel}>Today&apos;s Consensus Signal</span>
            <span className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              {w.model_count} / 5 Agree
            </span>
          </div>

          <div className={styles.heroBody}>
            <div className={styles.heroRow}>
              <div className={styles.tickerBlock}>
                <span className={styles.tickerName}>{w.ticker}</span>
                <span className={isUp ? styles.dirUp : styles.dirDown}>
                  {isUp ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  {isUp ? 'LONG' : 'SHORT'}
                </span>
              </div>
              <div className={styles.moveBlock}>
                <span className={styles.heroMetaLabel}>Expected move</span>
                <span className={isUp ? styles.moveUp : styles.moveDown}>
                  {isUp ? '+' : ''}{w.expected_move_pct?.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className={styles.heroMeta}>
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaLabel}>Entry</span>
                <span className={styles.heroMetaValue}>${w.avg_entry?.toFixed(2)}</span>
              </div>
              <div className={styles.heroMetaDivider} />
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaLabel}>Target</span>
                <span className={styles.heroMetaValue}>${w.avg_target?.toFixed(2)}</span>
              </div>
              <div className={styles.heroMetaDivider} />
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaLabel}>Confidence</span>
                <span className={styles.heroMetaValue}>
                  {(w.avg_confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className={styles.confBarWrap}>
              <div
                className={styles.confBar}
                style={{ width: `${(w.avg_confidence || 0) * 100}%` }}
              />
            </div>

            <div className={styles.heroModels}>
              {w.models?.map(m => (
                <span
                  key={m}
                  className={styles.modelChip}
                  style={{ borderColor: `${MODEL_COLORS[m]}55`, color: MODEL_COLORS[m] }}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Today's signals */}
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Today&apos;s Signals</span>
          <Link to="/signals" className={styles.panelLink}>
            View all <ArrowRight size={12} />
          </Link>
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
