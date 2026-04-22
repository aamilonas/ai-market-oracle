import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { loadTodaysWinner, MODEL_COLORS } from '../data/useData'
import { useCountUp } from '../hooks/useCountUp'
import styles from './ConsensusSignalMockup.module.css'

// Fallback used when no live winner exists yet — still looks like real product data.
const DEMO = {
  ticker: 'NVDA',
  direction: 'up',
  avg_entry: 178.42,
  avg_target: 188.90,
  expected_move_pct: 5.87,
  avg_confidence: 0.74,
  model_count: 4,
  models: ['Claude', 'GPT-4o', 'Grok', 'Gemini'],
}

export default function ConsensusSignalMockup() {
  const [data, setData] = useState(null)

  useEffect(() => {
    loadTodaysWinner()
      .then(d => setData(d?.winner || DEMO))
      .catch(() => setData(DEMO))
  }, [])

  const w = data || DEMO
  const isUp = w.direction === 'up'
  const confPct = useCountUp((w.avg_confidence || 0) * 100, 900, 0)
  const movePct = useCountUp(w.expected_move_pct || 0, 900, 2)

  return (
    <div className={styles.card}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.header}>
        <span className={styles.label}>Today&apos;s Consensus Signal</span>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          {w.model_count} / 5 Agree
        </span>
      </div>

      <div className={styles.row}>
        <div className={styles.tickerBlock}>
          <span className={styles.ticker}>{w.ticker}</span>
          <span className={isUp ? styles.dirUp : styles.dirDown}>
            {isUp ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            {isUp ? 'LONG' : 'SHORT'}
          </span>
        </div>
        <div className={styles.moveBlock}>
          <span className={styles.moveLabel}>Expected</span>
          <span className={isUp ? styles.moveUp : styles.moveDown}>
            {isUp ? '+' : ''}{movePct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>Entry</span>
          <span className={styles.metaValue}>${w.avg_entry?.toFixed(2)}</span>
        </div>
        <div className={styles.metaDivider} />
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>Target</span>
          <span className={styles.metaValue}>${w.avg_target?.toFixed(2)}</span>
        </div>
        <div className={styles.metaDivider} />
        <div className={styles.metaCell}>
          <span className={styles.metaLabel}>Confidence</span>
          <span className={styles.metaValue}>{confPct}%</span>
        </div>
      </div>

      <div className={styles.confBarWrap}>
        <div className={styles.confBar} style={{ width: `${confPct}%` }} />
      </div>

      <div className={styles.models}>
        {(w.models || []).map(m => (
          <span
            key={m}
            className={styles.chip}
            style={{ borderColor: `${MODEL_COLORS[m] || '#666'}55`, color: MODEL_COLORS[m] || 'var(--text-secondary)' }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  )
}
