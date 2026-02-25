import { NavLink } from 'react-router-dom'
import { MODEL_COLORS } from '../data/useData'
import styles from './TodaysWinner.module.css'

export default function TodaysWinner({ winner }) {
  if (!winner) {
    return (
      <div className={styles.card}>
        <span className={styles.label}>TODAY'S WINNER</span>
        <p className={styles.noConsensus}>No Consensus Today</p>
        <p className={styles.noConsensusSub}>Fewer than 4 models agreed on any single stock pick.</p>
      </div>
    )
  }

  const isUp = winner.direction === 'up'
  const movePct = winner.expected_move_pct?.toFixed(2)
  const confPct = (winner.avg_confidence * 100).toFixed(0)

  return (
    <div className={[styles.card, isUp ? styles.cardUp : styles.cardDown].join(' ')}>
      <div className={styles.top}>
        <span className={styles.label}>TODAY'S WINNER</span>
        {winner.high_conviction && (
          <span className={styles.highConviction}>HIGH CONVICTION</span>
        )}
      </div>

      <div className={styles.main}>
        <span className={styles.ticker}>{winner.ticker}</span>
        <span className={[styles.dirBadge, isUp ? styles.up : styles.down].join(' ')}>
          {isUp ? '▲' : '▼'} {winner.direction.toUpperCase()}
        </span>
        <span className={styles.confidence}>{confPct}% avg confidence</span>
      </div>

      <div className={styles.priceRow}>
        <span className={styles.priceLabel}>Entry</span>
        <span className={styles.priceValue}>${winner.avg_entry?.toFixed(2)}</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.priceLabel}>Target</span>
        <span className={styles.priceValue}>${winner.avg_target?.toFixed(2)}</span>
        <span className={[styles.movePct, isUp ? styles.up : styles.down].join(' ')}>
          {isUp ? '+' : '-'}{movePct}%
        </span>
      </div>

      <div className={styles.models}>
        {winner.models?.map(model => (
          <span
            key={model}
            className={styles.modelChip}
            style={{ borderColor: MODEL_COLORS[model] || '#555' }}
          >
            {model}
          </span>
        ))}
      </div>

      <NavLink to="/simulator" className={styles.simLink}>
        View Paper Trading →
      </NavLink>
    </div>
  )
}
