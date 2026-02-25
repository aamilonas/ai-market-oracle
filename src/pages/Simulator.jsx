import { useState, useEffect } from 'react'
import { loadSimulator } from '../data/useData'
import { MODEL_COLORS } from '../data/useData'
import styles from './Simulator.module.css'

export default function Simulator() {
  const [sim, setSim] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSimulator()
      .then(setSim)
      .catch(() => setSim(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!sim) return <div className={styles.loading}>Simulator data not available yet.</div>

  const { balance, starting_balance, trades } = sim
  const totalPnl = round(balance - starting_balance)
  const totalPnlPct = starting_balance ? round((totalPnl / starting_balance) * 100) : 0
  const closedTrades = trades.filter(t => t.status === 'CLOSED')
  const wins = closedTrades.filter(t => t.pnl > 0).length
  const winRate = closedTrades.length > 0 ? round((wins / closedTrades.length) * 100) : 0
  const openTrade = trades.find(t => t.status === 'OPEN') || null

  const sortedTrades = [...trades].reverse()

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Paper Trading Simulator</h1>
        <p className={styles.tagline}>
          Auto-trades the daily consensus pick — entering in the morning, exiting at close.
          Started with $25,000.
        </p>
      </section>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Balance</span>
          <span className={[
            styles.statValue,
            totalPnl >= 0 ? styles.statUp : styles.statDown,
          ].join(' ')}>
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total P&L</span>
          <span className={[
            styles.statValue,
            totalPnl >= 0 ? styles.statUp : styles.statDown,
          ].join(' ')}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className={styles.statPct}> ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct}%)</span>
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Win Rate</span>
          <span className={styles.statValue}>{winRate}%</span>
          <span className={styles.statSub}>{wins} of {closedTrades.length} trades</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Trades</span>
          <span className={styles.statValue}>{trades.length}</span>
        </div>
      </div>

      {openTrade && (
        <section className={styles.openPosition}>
          <h2 className={styles.sectionTitle}>Open Position</h2>
          <div className={styles.openCard}>
            <div className={styles.openMain}>
              <span className={styles.openTicker}>{openTrade.ticker}</span>
              <span className={[
                styles.dirBadge,
                openTrade.direction === 'up' ? styles.badgeUp : styles.badgeDown,
              ].join(' ')}>
                {openTrade.direction === 'up' ? '▲' : '▼'} {openTrade.direction.toUpperCase()}
              </span>
            </div>
            <div className={styles.openDetails}>
              <span>Entry: <strong>${openTrade.entry_price?.toFixed(2)}</strong></span>
              <span>Shares: <strong>{openTrade.shares}</strong></span>
              <span>Confidence: <strong>{(openTrade.confidence * 100).toFixed(0)}%</strong></span>
            </div>
            <div className={styles.openModels}>
              {openTrade.models?.map(model => (
                <span
                  key={model}
                  className={styles.modelChip}
                  style={{ borderColor: MODEL_COLORS[model] || '#555' }}
                >
                  {model}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {trades.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Trade History</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ticker</th>
                  <th>Dir</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Shares</th>
                  <th>P&L $</th>
                  <th>P&L %</th>
                  <th>Models</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {sortedTrades.map((trade, i) => {
                  const isWin = trade.pnl > 0
                  const isLoss = trade.pnl !== null && trade.pnl < 0
                  const isOpen = trade.status === 'OPEN'
                  return (
                    <tr
                      key={i}
                      className={[
                        styles.row,
                        isWin ? styles.rowWin : '',
                        isLoss ? styles.rowLoss : '',
                      ].join(' ')}
                    >
                      <td className={styles.mono}>{trade.date}</td>
                      <td className={styles.mono}><strong>{trade.ticker}</strong></td>
                      <td>
                        <span className={[
                          styles.dirBadgeSmall,
                          trade.direction === 'up' ? styles.badgeUp : styles.badgeDown,
                        ].join(' ')}>
                          {trade.direction === 'up' ? '▲' : '▼'}
                        </span>
                      </td>
                      <td className={styles.mono}>${trade.entry_price?.toFixed(2)}</td>
                      <td className={styles.mono}>{trade.exit_price != null ? `$${trade.exit_price.toFixed(2)}` : '—'}</td>
                      <td>{trade.shares}</td>
                      <td className={[styles.mono, isWin ? styles.pnlUp : '', isLoss ? styles.pnlDown : ''].join(' ')}>
                        {trade.pnl != null ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                      </td>
                      <td className={[styles.mono, isWin ? styles.pnlUp : '', isLoss ? styles.pnlDown : ''].join(' ')}>
                        {trade.pnl_pct != null ? `${trade.pnl_pct >= 0 ? '+' : ''}${trade.pnl_pct}%` : '—'}
                      </td>
                      <td className={styles.modelsCell}>
                        {trade.models?.map(m => (
                          <span key={m} className={styles.modelChipSmall}>{m}</span>
                        ))}
                      </td>
                      <td>
                        {isOpen && <span className={styles.statusOpen}>OPEN</span>}
                        {isWin && <span className={styles.statusWin}>WIN</span>}
                        {isLoss && <span className={styles.statusLoss}>LOSS</span>}
                        {!isOpen && trade.pnl === 0 && <span className={styles.statusFlat}>FLAT</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {trades.length === 0 && (
        <div className={styles.empty}>
          No trades yet. The simulator will open its first trade when 4+ models agree on a stock pick.
        </div>
      )}
    </div>
  )
}

function round(n, d = 2) {
  return Math.round(n * 10 ** d) / 10 ** d
}
