import { useState, useEffect } from 'react'
import { loadSimulator, MODEL_COLORS } from '../data/useData'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import styles from './Portfolio.module.css'

function round(n, d = 2) {
  return Math.round(n * 10 ** d) / 10 ** d
}

export default function Portfolio() {
  const [sim, setSim] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSimulator()
      .then(setSim)
      .catch(() => setSim(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="animate-in">
        <h1 className={styles.title}>Portfolio</h1>
        <div className={`${styles.statsGrid} stagger`}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!sim) {
    return (
      <div className="animate-in">
        <h1 className={styles.title}>Portfolio</h1>
        <div className={styles.empty}>Portfolio data not available yet.</div>
      </div>
    )
  }

  const { balance, starting_balance, trades } = sim
  const totalPnl = round(balance - starting_balance)
  const totalPnlPct = starting_balance ? round((totalPnl / starting_balance) * 100) : 0
  const closedTrades = trades.filter(t => t.status === 'CLOSED')
  const wins = closedTrades.filter(t => t.pnl > 0).length
  const winRate = closedTrades.length > 0 ? round((wins / closedTrades.length) * 100) : 0
  const openTrade = trades.find(t => t.status === 'OPEN') || null
  const sortedTrades = [...trades].reverse()

  // Build equity curve data
  const equityData = [{ date: 'Start', balance: starting_balance }]
  let runningBalance = starting_balance
  for (const t of trades) {
    if (t.status === 'CLOSED' && t.pnl != null) {
      runningBalance = round(runningBalance + t.pnl)
      equityData.push({ date: t.date.slice(5), balance: runningBalance })
    }
  }

  return (
    <div className="animate-in">
      <h1 className={styles.title}>Portfolio</h1>
      <p className={styles.sub}>
        Live performance from your connected account. Funded April 2, 2026.
      </p>

      {/* Performance Stats */}
      <div className={`${styles.statsGrid} stagger`}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Balance</span>
          <span className={styles.statValue} style={{ color: totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total P&L</span>
          <span className={styles.statValue} style={{ color: totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className={styles.pctTag}> ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct}%)</span>
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Win Rate</span>
          <span className={styles.statValue} style={{ color: winRate >= 50 ? 'var(--positive)' : 'var(--negative)' }}>
            {winRate}%
          </span>
          <span className={styles.statSub}>{wins} of {closedTrades.length} trades</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Trades</span>
          <span className={styles.statValue}>{trades.length}</span>
          <span className={styles.statSub}>Since Apr 2, 2026</span>
        </div>
      </div>

      {/* Equity Curve */}
      {equityData.length > 1 && (
        <div className={styles.chartWrap}>
          <div className={styles.chartHeader}>
            <span className={styles.chartTitle}>Equity Curve</span>
            <span className={styles.chartLabel}>
              ${starting_balance.toLocaleString()} → ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={equityData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={['dataMin - 200', 'dataMax + 200']}
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-tertiary)', fontSize: 11 }}
                  formatter={(v) => [`$${v.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Balance']}
                />
                <ReferenceLine y={starting_balance} stroke="var(--text-tertiary)" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke={totalPnl >= 0 ? 'var(--positive)' : 'var(--negative)'}
                  strokeWidth={2}
                  dot={{ r: 4, fill: totalPnl >= 0 ? '#22c55e' : '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Open Position */}
      {openTrade && (
        <div className={styles.openCard}>
          <div className={styles.openHeader}>
            <span className={styles.openLabel}>Open Position</span>
            <span className={styles.openLive}>LIVE</span>
          </div>
          <div className={styles.openBody}>
            <div className={styles.openTicker}>
              <span className={styles.tickerName}>{openTrade.ticker}</span>
              <span className={`${styles.dirBadge} ${openTrade.direction === 'up' ? styles.up : styles.down}`}>
                {openTrade.direction === 'up' ? '↑' : '↓'} {openTrade.direction.toUpperCase()}
              </span>
            </div>
            <div className={styles.openMeta}>
              <div className={styles.openMetaItem}>
                <span className={styles.openMetaLabel}>Entry</span>
                <span className={styles.openMetaValue}>${openTrade.entry_price?.toFixed(2)}</span>
              </div>
              <div className={styles.openMetaItem}>
                <span className={styles.openMetaLabel}>Shares</span>
                <span className={styles.openMetaValue}>{openTrade.shares}</span>
              </div>
              <div className={styles.openMetaItem}>
                <span className={styles.openMetaLabel}>Position Value</span>
                <span className={styles.openMetaValue}>
                  ${(openTrade.entry_price * openTrade.shares).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className={styles.openMetaItem}>
                <span className={styles.openMetaLabel}>Confidence</span>
                <span className={styles.openMetaValue}>{(openTrade.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div className={styles.openModels}>
              {openTrade.models?.map(m => (
                <span key={m} className={styles.modelChip} style={{ borderColor: MODEL_COLORS[m], color: MODEL_COLORS[m] }}>
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trade History */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>Trade History</span>
          <span className={styles.tableCount}>{trades.length} trades since Apr 2</span>
        </div>

        {trades.length === 0 ? (
          <div className={styles.empty}>No trades yet.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Direction</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Shares</th>
                <th>P&L</th>
                <th>Models</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.map((t, i) => {
                const isWin = t.pnl > 0
                const isLoss = t.pnl !== null && t.pnl < 0
                const isOpen = t.status === 'OPEN'
                return (
                  <tr key={i} className={isWin ? styles.rowWin : isLoss ? styles.rowLoss : ''}>
                    <td className={styles.dateCell}>{t.date}</td>
                    <td className={styles.tickerCell}>{t.ticker}</td>
                    <td>
                      <span className={`${styles.dirTag} ${t.direction === 'up' ? styles.up : styles.down}`}>
                        {t.direction === 'up' ? '↑' : '↓'}
                      </span>
                    </td>
                    <td className={styles.numCell}>${t.entry_price?.toFixed(2)}</td>
                    <td className={styles.numCell}>
                      {t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : '—'}
                    </td>
                    <td className={styles.numCell}>{t.shares}</td>
                    <td className={`${styles.numCell} ${isWin ? styles.scorePos : ''} ${isLoss ? styles.scoreNeg : ''}`}>
                      {t.pnl != null ? (
                        <>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                          <span className={styles.pnlPct}> ({t.pnl_pct >= 0 ? '+' : ''}{t.pnl_pct}%)</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className={styles.modelsCell}>
                      {t.models?.map(m => (
                        <span key={m} className={styles.modelChipSmall} style={{ color: MODEL_COLORS[m] }}>
                          {m}
                        </span>
                      ))}
                    </td>
                    <td>
                      {isOpen && <span className={styles.statusOpen}>OPEN</span>}
                      {isWin && <span className={`${styles.resultBadge} ${styles.win}`}>WIN</span>}
                      {isLoss && <span className={`${styles.resultBadge} ${styles.loss}`}>LOSS</span>}
                      {!isOpen && t.pnl === 0 && <span className={styles.resultBadge}>FLAT</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
