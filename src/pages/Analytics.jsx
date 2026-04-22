import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { loadAnalytics, MODEL_COLORS } from '../data/useData'
import styles from './Analytics.module.css'

const COLORS = MODEL_COLORS

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>Loading analytics...</div>
  if (!data) return <div className={styles.loading}>No analytics data available yet.</div>

  const {
    data_range = {},
    ticker_breakdown = {},
    calibration = {},
    herding = {},
    time_series = {},
    head_to_head = {},
  } = data
  const models = Object.keys(COLORS)
  const byGroup = ticker_breakdown.by_group || []
  const byTicker = ticker_breakdown.by_ticker || []
  const calibrationModels = calibration.models || []
  const dailySeries = time_series.daily || []
  const rollingSeries = time_series.rolling_accuracy || []
  const herdingSeries = herding.daily_herding || []
  const herdingSummary = herding.summary || {}
  const h2hRecords = head_to_head.records || []
  const recentClashes = head_to_head.recent_clashes || []

  // Find best accuracy and best calibration
  const modelAccuracy = {}
  for (const r of byGroup.flatMap(g => g.models || [])) {
    if (!modelAccuracy[r.model]) modelAccuracy[r.model] = { correct: 0, total: 0 }
    modelAccuracy[r.model].correct += r.correct
    modelAccuracy[r.model].total += r.predictions
  }
  const bestAccModel = Object.entries(modelAccuracy)
    .map(([m, d]) => ({ model: m, accuracy: d.total ? d.correct / d.total : 0 }))
    .sort((a, b) => b.accuracy - a.accuracy)[0]

  const bestCalModel = [...calibrationModels]
    .sort((a, b) => a.calibration_error - b.calibration_error)[0]

  // Ticker bar chart data — top tickers by total predictions
  const tickerChartData = byTicker
    .map(t => {
      const entry = { ticker: t.ticker }
      for (const m of t.models) entry[m.model] = Math.round(m.accuracy * 100)
      return entry
    })
    .sort((a, b) => {
      const sumA = models.reduce((s, m) => s + (a[m] || 0), 0)
      const sumB = models.reduce((s, m) => s + (b[m] || 0), 0)
      return sumB - sumA
    })
    .slice(0, 8)

  // Calibration chart data
  const calChartData = [
    { confidence: '55%', midpoint: 55, Perfect: 55 },
    { confidence: '65%', midpoint: 65, Perfect: 65 },
    { confidence: '75%', midpoint: 75, Perfect: 75 },
    { confidence: '85%', midpoint: 85, Perfect: 85 },
    { confidence: '93%', midpoint: 93, Perfect: 93 },
  ]
  for (const m of calibrationModels) {
    for (const b of m.buckets) {
      const idx = calChartData.findIndex(d => d.midpoint === Math.round(b.confidence_midpoint * 100))
      if (idx >= 0) calChartData[idx][m.model] = Math.round(b.actual_accuracy * 100)
    }
  }

  // Cumulative score chart
  const cumulativeData = dailySeries.map(d => {
    const entry = { date: d.date.slice(5) }
    for (const m of models) {
      if (d[m]) entry[m] = d[m].cumulative_score
    }
    return entry
  })

  // Rolling accuracy chart
  const rollingData = rollingSeries.map(d => {
    const entry = { date: d.date.slice(5) }
    for (const m of models) {
      if (d[m] != null) entry[m] = Math.round(d[m] * 100)
    }
    return entry
  })

  // Herding over time
  const herdingData = herdingSeries.map(d => ({
    date: d.date.slice(5),
    rate: Math.round(d.herding_rate * 100),
  }))

  // H2H matrix helper
  const h2hMap = {}
  for (const rec of h2hRecords) {
    h2hMap[`${rec.model_a}_${rec.model_b}`] = rec
    h2hMap[`${rec.model_b}_${rec.model_a}`] = {
      ...rec, a_wins: rec.b_wins, b_wins: rec.a_wins,
      a_win_rate: rec.a_wins + rec.b_wins ? round4(rec.b_wins / (rec.a_wins + rec.b_wins)) : 0.5,
    }
  }

  const activeModels = models.filter(m =>
    dailySeries.some(d => d[m] && d[m].predictions > 0)
  )

  return (
    <div className={`${styles.page} animate-in`}>
      {/* Hero */}
      <div className={styles.hero}>
        <h1 className={styles.title}>Performance Analytics</h1>
        <p className={styles.sub}>
          Deep statistical analysis of {data_range.total_predictions} predictions across {data_range.scoring_days} trading days ({data_range.first_date} to {data_range.last_date}).
        </p>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Predictions</span>
          <span className={styles.statValue}>{data_range.total_predictions}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Trading Days</span>
          <span className={styles.statValue}>{data_range.scoring_days}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Most Accurate</span>
          <span className={styles.statValue} style={{ color: COLORS[bestAccModel?.model] }}>
            {bestAccModel?.model || '—'}
          </span>
          <span className={styles.statLabel}>{bestAccModel ? `${(bestAccModel.accuracy * 100).toFixed(1)}%` : '—'}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Best Calibrated</span>
          <span className={styles.statValue} style={{ color: COLORS[bestCalModel?.model] }}>
            {bestCalModel?.model || '—'}
          </span>
          <span className={styles.statLabel}>{bestCalModel ? `${(bestCalModel.calibration_error * 100).toFixed(1)}% error` : '—'}</span>
        </div>
      </div>

      {/* Section 1: Ticker Breakdown */}
      <section>
        <h2 className={styles.sectionTitle}>Accuracy by Ticker</h2>
        <p className={styles.sectionSub}>Direction accuracy (%) for most-predicted tickers</p>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tickerChartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="ticker" tick={{ fill: '#888', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 12 }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                formatter={(v) => `${v}%`}
              />
              <Legend />
              {activeModels.map(m => (
                <Bar key={m} dataKey={m} fill={COLORS[m]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <h3 className={styles.sectionTitle}>By Category</h3>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Group</th>
                  {activeModels.map(m => <th key={m} className={styles.th}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {byGroup.map(g => (
                  <tr key={g.group} className={styles.tr}>
                    <td className={styles.td} style={{ fontWeight: 600, textTransform: 'capitalize' }}>{g.group}</td>
                    {activeModels.map(m => {
                      const md = g.models.find(x => x.model === m)
                      return (
                        <td key={m} className={styles.td}>
                          {md ? (
                            <span className={md.accuracy >= 0.5 ? styles.pos : styles.neg}>
                              {(md.accuracy * 100).toFixed(1)}%
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({md.correct}/{md.predictions})</span>
                            </span>
                          ) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 2: Calibration */}
      <section>
        <h2 className={styles.sectionTitle}>Confidence Calibration</h2>
        <p className={styles.calibrationNote}>
          The dashed line shows perfect calibration — when a model says 70% confident, it should be right 70% of the time.
        </p>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={calChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="confidence" tick={{ fill: '#888', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 12 }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                formatter={(v) => `${v}%`}
              />
              <Legend />
              <Line dataKey="Perfect" stroke="#555" strokeDasharray="5 5" dot={false} />
              {activeModels.map(m => (
                <Line key={m} dataKey={m} stroke={COLORS[m]} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Model</th>
                  <th className={styles.th}>Calibration Error</th>
                  <th className={styles.th}>Buckets</th>
                </tr>
              </thead>
              <tbody>
                {calibrationModels
                  .filter(m => activeModels.includes(m.model))
                  .sort((a, b) => a.calibration_error - b.calibration_error)
                  .map(m => (
                    <tr key={m.model} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: 600, color: COLORS[m.model] }}>{m.model}</td>
                      <td className={styles.td}>{(m.calibration_error * 100).toFixed(1)}%</td>
                      <td className={styles.td} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {m.buckets.map(b => `${b.confidence_range}: ${(b.actual_accuracy * 100).toFixed(0)}%`).join(' · ')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: Herding */}
      <section>
        <h2 className={styles.sectionTitle}>Model Agreement</h2>
        <p className={styles.sectionSub}>How often do models agree on direction for the same ticker?</p>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Herding Rate</span>
            <span className={styles.statValue}>{typeof herdingSummary.herding_rate === 'number' ? `${(herdingSummary.herding_rate * 100).toFixed(0)}%` : '—'}</span>
            <span className={styles.statLabel}>{herdingSummary.unanimous ?? 0}/{herdingSummary.total_overlaps ?? 0} unanimous</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Consensus Accuracy</span>
            <span className={styles.statValue}>{typeof herdingSummary.unanimous_accuracy === 'number' ? `${(herdingSummary.unanimous_accuracy * 100).toFixed(0)}%` : '—'}</span>
            <span className={styles.statLabel}>When all agree</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Contrarian Wins</span>
            <span className={styles.statValue}>{herdingSummary.contrarian_wins ?? 0}</span>
            <span className={styles.statLabel}>Minority was right</span>
          </div>
        </div>

        <div className={styles.chart} style={{ marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={herdingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                formatter={(v) => `${v}%`}
              />
              <Line dataKey="rate" name="Herding Rate" stroke="#8884d8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 4: Performance Over Time */}
      <section>
        <h2 className={styles.sectionTitle}>Cumulative Score Over Time</h2>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis tick={{ fill: '#888', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
              <Legend />
              <ReferenceLine y={0} stroke="#555" strokeDasharray="3 3" />
              {activeModels.map(m => (
                <Line key={m} dataKey={m} stroke={COLORS[m]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>5-Day Rolling Accuracy</h2>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rollingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 12 }} tickFormatter={v => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                formatter={(v) => `${v}%`}
              />
              <Legend />
              <ReferenceLine y={50} stroke="#555" strokeDasharray="3 3" label={{ value: '50%', fill: '#555', fontSize: 11 }} />
              {activeModels.map(m => (
                <Line key={m} dataKey={m} stroke={COLORS[m]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 5: Head-to-Head */}
      <section>
        <h2 className={styles.sectionTitle}>Head-to-Head</h2>
        <p className={styles.sectionSub}>Win-loss records when two models predict the same ticker on the same day</p>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>vs</th>
                {activeModels.map(m => <th key={m} className={styles.th} style={{ textAlign: 'center' }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {activeModels.map(row => (
                <tr key={row} className={styles.tr}>
                  <td className={styles.td} style={{ fontWeight: 600, color: COLORS[row] }}>{row}</td>
                  {activeModels.map(col => {
                    if (row === col) {
                      return <td key={col} className={`${styles.td} ${styles.matrixCell} ${styles.matrixSelf}`}>—</td>
                    }
                    const key = `${row}_${col}`
                    const rec = h2hMap[key]
                    if (!rec) return <td key={col} className={`${styles.td} ${styles.matrixCell}`}>—</td>
                    const wins = row === rec.model_a ? rec.a_wins : rec.b_wins
                    const losses = row === rec.model_a ? rec.b_wins : rec.a_wins
                    return (
                      <td key={col} className={`${styles.td} ${styles.matrixCell}`}>
                        <span className={wins > losses ? styles.pos : wins < losses ? styles.neg : ''}>
                          {wins}W-{losses}L
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}> ({rec.ties}T)</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentClashes.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h3 className={styles.sectionTitle}>Recent Clashes</h3>
            <div className={styles.h2hList}>
              {recentClashes.slice(-10).reverse().map((c, i) => (
                <div key={i} className={styles.h2hCard}>
                  <div className={styles.h2hHeader}>
                    <span className={styles.h2hTicker}>{c.ticker}</span>
                    <span className={styles.h2hDate}>{c.date}</span>
                    <span className={styles.h2hWinner}>Winner: {c.winner}</span>
                  </div>
                  <div className={styles.h2hModels}>
                    <span className={`${styles.h2hModel} ${c.model_a_correct ? styles.h2hModelCorrect : styles.h2hModelWrong}`}>
                      {c.model_a} ({c.model_a_direction})
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', alignSelf: 'center' }}>vs</span>
                    <span className={`${styles.h2hModel} ${c.model_b_correct ? styles.h2hModelCorrect : styles.h2hModelWrong}`}>
                      {c.model_b} ({c.model_b_direction})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function round4(n) {
  return Math.round(n * 10000) / 10000
}
