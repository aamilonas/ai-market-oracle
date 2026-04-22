import { useEffect, useState } from 'react'
import { loadPredictions, getTodayDate, MODEL_NAMES } from '../data/useData'
import styles from './LiveTickerStrip.module.css'

/**
 * Thin horizontal strip under the hero showing today's top 5 highest-confidence
 * predictions across all models. Auto-hides if no data for today.
 */
export default function LiveTickerStrip() {
  const [signals, setSignals] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const today = getTodayDate()
      const results = await Promise.allSettled(
        MODEL_NAMES.map(m => loadPredictions(today, m))
      )
      const all = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.predictions || [])

      if (all.length === 0) {
        if (!cancelled) setSignals([])
        return
      }

      // top 5 by confidence, de-duped by (ticker, direction)
      const seen = new Set()
      const top = []
      for (const p of [...all].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))) {
        const k = `${p.ticker}_${p.direction}`
        if (seen.has(k)) continue
        seen.add(k)
        top.push(p)
        if (top.length === 5) break
      }

      if (!cancelled) {
        setSignals(top)
        setUpdatedAt(new Date())
      }
    }

    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Hide strip entirely when we have no data at all (e.g. before morning run).
  if (!signals || signals.length === 0) return null

  const fmtTime = (d) =>
    d?.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
      timeZoneName: 'short',
    })

  return (
    <div className={styles.strip}>
      <span className={styles.liveBadge}>
        <span className={styles.liveDot} />
        LIVE
      </span>
      <ul className={styles.items}>
        {signals.map((s, i) => (
          <li key={i} className={styles.item}>
            <span className={styles.ticker}>{s.ticker}</span>
            <span
              className={s.direction === 'up' ? styles.up : styles.down}
              aria-label={s.direction}
            >
              {s.direction === 'up' ? '↑' : '↓'}
            </span>
            <span className={styles.conf}>{Math.round((s.confidence || 0) * 100)}%</span>
          </li>
        ))}
      </ul>
      {updatedAt && (
        <span className={styles.updated}>Updated {fmtTime(updatedAt)}</span>
      )}
    </div>
  )
}
