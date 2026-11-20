import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { loadExperiment, MODELS, ACTIVE_MODELS } from '../data/useData'
import styles from './Experiment.module.css'

// Series colors: categorical slots 1-4, validated together against the dark card surface.
// Benchmarks also get a dashed line so they never depend on color alone.
const STRATEGIES = [
  {
    key: 'premarket', name: '9:00 AM pick', short: '9:00 AM', ai: true, color: '#3987e5',
    rule: 'All nine models answer at 9:00 AM, before the market opens. Buy the consensus pick at the 9:30 open.',
  },
  {
    key: 'late', name: '10:00 AM pick', short: '10:00 AM', ai: true, color: '#d95926',
    rule: 'The same models are asked again at 10:00 AM, after the opening rush. Buy at the live price as soon as they have all answered.',
  },
  {
    key: 'spy', name: 'Buy SPY', short: 'SPY', ai: false, color: '#199e70', dash: '6 4',
    rule: 'No AI. Buy SPY at the open and sell it at the close, every trading day.',
  },
  {
    key: 'trend', name: "Yesterday's mover", short: 'Trend', ai: false, color: '#c98500', dash: '6 4',
    rule: 'No AI. Take the watchlist stock that moved most the day before and bet it keeps going, open to close, every trading day.',
  },
]
const AI_ARMS = STRATEGIES.filter(s => s.ai)
const NAME_BY_SLUG = Object.fromEntries(MODELS.map(m => [m.slug, m.display_name]))

export default function Experiment() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExperiment()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!data) return <div className={styles.loading}>Experiment data not available yet.</div>

  const start = data.starting_balance
  const target = data.target_trades || 25
  const summaries = Object.fromEntries(STRATEGIES.map(s => [s.key, summarize(data.arms[s.key], start)]))
  const days = allDays(data.arms)
  const settledDays = days.filter(d => STRATEGIES.some(s => tradeOn(data.arms[s.key], d)?.status === 'CLOSED'))
  const aiTrades = AI_ARMS.map(s => summaries[s.key].closed.length)
  const started = days.length > 0

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>Timing Experiment</h1>
        <p className={styles.tagline}>
          The same nine models and the same consensus rule, asked at two times of day. Each side
          trades $25,000 of paper money, next to two simple rules that use no AI. The question: which
          one actually makes money?
        </p>
      </section>

      <StatusBanner
        started={started}
        startDate={data.start_date}
        settledDays={settledDays.length}
        aiTrades={aiTrades}
        target={target}
      />

      <section>
        <h2 className={styles.sectionTitle}>The four strategies</h2>
        <div className={styles.cardGrid}>
          {STRATEGIES.map(s => (
            <StrategyCard key={s.key} strategy={s} summary={summaries[s.key]} start={start} />
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Account value</h2>
        {settledDays.length > 0 ? (
          <EquityChart arms={data.arms} days={settledDays} start={start} />
        ) : (
          <div className={styles.empty}>The chart starts after the first 4:00 PM close of the experiment.</div>
        )}
      </section>

      <PredictionComparison stats={data.prediction_stats || {}} />

      <section>
        <h2 className={styles.sectionTitle}>Day by day</h2>
        {started ? (
          <DayTable arms={data.arms} days={[...days].reverse()} />
        ) : (
          <div className={styles.empty}>No trading days yet.</div>
        )}
      </section>

      <section className={styles.rules}>
        <h2 className={styles.sectionTitle}>Rules</h2>
        <ul className={styles.ruleList}>
          <li>
            Both AI sides use the <Link to="/simulator">simulator&apos;s</Link> consensus rule. A trade happens only
            when at least 4 models make the same call on the same stock (5 for SPY or QQQ, which are traded as
            the 3x ETFs SPXL and TQQQ). If several calls qualify, the strongest agreement times the biggest
            expected move wins. With no consensus, that side sits the day out.
          </li>
          <li>
            Every strategy starts with $25,000, puts the whole balance into one position (whole shares only) and
            sells at the 4:00 PM close. Nothing is held overnight.
          </li>
          <li>
            The 9:00 side only counts if its picks are in before the 9:30 open. The 10:00 side only counts if its
            picks are in between 9:45 and 11:00 AM. A late or failed run is a day without a trade, never a trade at
            a price the models could already have seen.
          </li>
          <li>The first pick of each day is locked. Rerunning a model later cannot change it.</li>
          <li>
            Prices come from Yahoo Finance. Commissions and slippage are not included, so real results would be a
            little worse.
          </li>
          <li>
            &ldquo;Every prediction&rdquo; measures each stock or ETF call (crypto excluded) from the price you could
            have bought at to the close. For the 9:00 side that is the 9:30 open; for the 10:00 side it is the price
            right after the models answered.
          </li>
          <li>
            Why this exists: before Nov 20, 2026 the morning job ran hours late on GitHub Actions, but the simulator
            still filled every trade at the 9:30 open. Most of its early gains came from moves the models had
            already seen.
          </li>
        </ul>
      </section>
    </div>
  )
}

function StatusBanner({ started, startDate, settledDays, aiTrades, target }) {
  if (!started) {
    return (
      <div className={styles.banner}>
        <strong>Starts {formatDate(startDate, { weekday: 'long', month: 'short', day: 'numeric' })}.</strong>{' '}
        The first picks come in at 9:00 and 10:00 AM ET, and the first results after the 4:00 PM close.
      </div>
    )
  }
  const fewest = Math.min(...aiTrades)
  const pct = Math.min(100, Math.round((fewest / target) * 100))
  const enough = fewest >= target
  return (
    <div className={styles.banner}>
      <div className={styles.bannerText}>
        <strong>{enough ? 'Enough trades for a first read.' : 'Too early to call.'}</strong>{' '}
        {plural(settledDays, 'trading day')} since {formatDate(startDate)}, with{' '}
        {plural(aiTrades[0], 'trade')} on the 9:00 side and {aiTrades[1]} on the 10:00 side.{' '}
        {enough
          ? 'Even now, only trust a gap that keeps holding up.'
          : `The comparison starts to mean something at about ${target} trades a side.`}
      </div>
      <div
        className={styles.meter}
        role="meter"
        aria-label="Trades toward a first read"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={fewest}
      >
        <div className={styles.meterFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.meterLabel}>{fewest} of {target} trades on the side with fewer</span>
    </div>
  )
}

function StrategyCard({ strategy: s, summary, start }) {
  const { balance, closed, wins, avgPct, skipped, open } = summary
  const pnl = balance - start
  const pnlPct = (pnl / start) * 100
  const tone = closed.length === 0 ? '' : pnl >= 0 ? styles.up : styles.down
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <LineKey color={s.color} dash={s.dash} />
        <span className={styles.cardName}>{s.name}</span>
        <span className={s.ai ? styles.tagAi : styles.tagBench}>{s.ai ? 'AI' : 'Benchmark'}</span>
      </div>
      <p className={styles.cardRule}>{s.rule}</p>
      <div className={styles.cardBalance}>
        <span className={styles.cardValue}>{money(balance)}</span>
        <span className={[styles.cardPct, tone].join(' ')}>
          {closed.length ? `${signed(pnlPct)}%` : '—'}
        </span>
      </div>
      <div className={styles.cardStats}>
        <span>Won <strong>{wins}</strong> of <strong>{closed.length}</strong></span>
        <span>Avg <strong>{closed.length ? `${signed(avgPct)}%` : '—'}</strong> a trade</span>
        {s.ai && <span>Sat out <strong>{skipped}</strong> {skipped === 1 ? 'day' : 'days'}</span>}
        {open && <span className={styles.openNote}>Open: {open.direction === 'up' ? '▲' : '▼'} {open.ticker}</span>}
      </div>
    </div>
  )
}

function EquityChart({ arms, days, start }) {
  const points = [{ date: 'Start', ...Object.fromEntries(STRATEGIES.map(s => [s.key, start])) }]
  const running = Object.fromEntries(STRATEGIES.map(s => [s.key, start]))
  for (const d of days) {
    for (const s of STRATEGIES) {
      const t = tradeOn(arms[s.key], d)
      if (t?.status === 'CLOSED' && t.balance_after != null) running[s.key] = t.balance_after
    }
    points.push({ date: d, ...running })
  }
  const ticks = niceTicks(points.flatMap(p => STRATEGIES.map(s => p[s.key])))

  return (
    <div className={styles.chartCard}>
      <ul className={styles.legend}>
        {STRATEGIES.map(s => (
          <li key={s.key}><LineKey color={s.color} dash={s.dash} /> {s.name}</li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={points} margin={{ top: 8, right: 28, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#222" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={d => (d === 'Start' ? d : formatDate(d))}
            tick={{ fill: '#888', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
            axisLine={{ stroke: '#262626' }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[ticks[0], ticks[ticks.length - 1]]}
            ticks={ticks}
            interval={0}
            tickFormatter={compactMoney}
            tick={{ fill: '#888', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <ReferenceLine y={start} stroke="#444" />
          <Tooltip content={<EquityTooltip />} cursor={{ stroke: '#555', strokeWidth: 1 }} />
          {STRATEGIES.map(s => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dash}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 5, stroke: '#161616', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function EquityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const rows = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>{label === 'Start' ? 'Start' : formatDate(label, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
      {rows.map(r => {
        const s = STRATEGIES.find(x => x.key === r.dataKey)
        return (
          <p key={r.dataKey} className={styles.tooltipRow}>
            <LineKey color={s.color} dash={s.dash} />
            <span className={styles.tooltipName}>{s.name}</span>
            <span className={styles.mono}>{money(r.value)}</span>
          </p>
        )
      })}
    </div>
  )
}

function PredictionComparison({ stats }) {
  const totals = {}
  const perModel = {}
  for (const s of AI_ARMS) {
    totals[s.key] = { n: 0, hits: 0, ret: 0 }
    for (const day of Object.values(stats[s.key] || {})) {
      for (const [slug, v] of Object.entries(day)) {
        totals[s.key].n += v.n
        totals[s.key].hits += v.hits
        totals[s.key].ret += v.ret
        const m = (perModel[slug] ??= {})
        const mv = (m[s.key] ??= { n: 0, hits: 0, ret: 0 })
        mv.n += v.n
        mv.hits += v.hits
        mv.ret += v.ret
      }
    }
  }
  if (!AI_ARMS.some(s => totals[s.key].n > 0)) return null

  const order = ACTIVE_MODELS.map(m => m.slug)
  const slugs = Object.keys(perModel).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  const cells = v => (v?.n
    ? [
        <td key="r" className={styles.mono}>{Math.round((v.hits / v.n) * 100)}% <span className={styles.muted}>of {v.n}</span></td>,
        <td key="a" className={[styles.mono, v.ret >= 0 ? styles.up : styles.down].join(' ')}>{signed(v.ret / v.n)}%</td>,
      ]
    : [<td key="r" className={styles.muted}>—</td>, <td key="a" className={styles.muted}>—</td>])

  return (
    <section>
      <h2 className={styles.sectionTitle}>Every prediction, not just the trade</h2>
      <p className={styles.sectionSub}>
        Each side trades at most once a day, so its own record grows slowly. Each model makes 3–5 calls a run,
        which gives a faster read on which time of day the models call better. A call is right when the stock
        moved its way from the price you could have bought at to the close. The average is the move in the
        called direction.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th rowSpan={2}>Model</th>
              <th colSpan={2} className={styles.groupHead}>9:00 AM</th>
              <th colSpan={2} className={styles.groupHead}>10:00 AM</th>
            </tr>
            <tr>
              <th>Right</th><th>Avg move</th><th>Right</th><th>Avg move</th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.totalRow}>
              <td>All models</td>
              {cells(totals.premarket)}
              {cells(totals.late)}
            </tr>
            {slugs.map(slug => (
              <tr key={slug}>
                <td>{NAME_BY_SLUG[slug] || slug}</td>
                {cells(perModel[slug].premarket)}
                {cells(perModel[slug].late)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DayTable({ arms, days }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            {STRATEGIES.map(s => (
              <th key={s.key}><LineKey color={s.color} dash={s.dash} /> {s.short}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(d => (
            <tr key={d}>
              <td className={styles.mono}>{formatDate(d, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
              {STRATEGIES.map(s => <td key={s.key}><DayCell arm={arms[s.key]} date={d} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DayCell({ arm, date }) {
  const t = tradeOn(arm, date)
  if (!t) {
    const skip = arm.skipped?.find(x => x.date === date)
    if (!skip) return <span className={styles.muted}>—</span>
    return <span className={styles.muted} title={skip.reason}>{skipLabel(skip.reason)}</span>
  }
  const arrow = t.direction === 'up' ? '▲' : '▼'
  const entry = t.entry_price != null ? `$${t.entry_price.toFixed(2)}` : '9:30 open'
  return (
    <div className={styles.dayCell} title={t.signal || (t.models ? `${t.model_count} models: ${t.models.join(', ')}` : '')}>
      <span className={styles.dayPick}>
        <span className={t.direction === 'up' ? styles.up : styles.down}>{arrow}</span> {t.ticker}
        {t.status === 'CLOSED' && t.pnl_pct != null && (
          <span className={[styles.dayPnl, t.pnl_pct >= 0 ? styles.up : styles.down].join(' ')}>
            {signed(t.pnl_pct)}%
          </span>
        )}
        {t.status === 'OPEN' && <span className={styles.statusOpen}>OPEN</span>}
      </span>
      <span className={styles.dayPrices}>
        {entry}{t.exit_price != null ? ` → $${t.exit_price.toFixed(2)}` : ''}
        {t.entry_rule === 'pick_time' && t.entry_at ? ` · bought ${formatTime(t.entry_at)}` : ''}
      </span>
    </div>
  )
}

function LineKey({ color, dash }) {
  return (
    <svg className={styles.lineKey} width="18" height="8" aria-hidden="true">
      <line x1="1" y1="4" x2="17" y2="4" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={dash ? '4 3' : undefined} />
    </svg>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────

function summarize(arm, start) {
  const trades = arm?.trades || []
  const closed = trades.filter(t => t.status === 'CLOSED' && t.pnl_pct != null)
  const wins = closed.filter(t => t.pnl > 0).length
  const avgPct = closed.length ? closed.reduce((a, t) => a + t.pnl_pct, 0) / closed.length : 0
  return {
    balance: arm?.balance ?? start,
    closed,
    wins,
    avgPct,
    skipped: (arm?.skipped || []).length,
    open: trades.find(t => t.status === 'OPEN') || null,
  }
}

function allDays(arms) {
  const set = new Set()
  for (const s of STRATEGIES) {
    for (const t of arms[s.key]?.trades || []) set.add(t.date)
    for (const x of arms[s.key]?.skipped || []) set.add(x.date)
  }
  return [...set].sort()
}

function tradeOn(arm, date) {
  return arm?.trades?.find(t => t.date === date)
}

function skipLabel(reason = '') {
  if (reason.startsWith('No consensus')) return 'No consensus'
  if (reason.startsWith('Picks came in')) return 'Missed its window'
  if (reason.startsWith('No pick recorded')) return 'Run failed'
  if (reason.startsWith('No live price')) return 'No price'
  return 'No trade'
}

function money(v) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// Clean y-axis ticks (whole hundreds or thousands) that always include the starting balance.
function niceTicks(values) {
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  const step = [250, 500, 1000, 2000, 2500, 5000, 10000, 25000].find(s => (hi - lo) / s <= 4) || 50000
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  if (lo === hi) { lo -= step; hi += step }
  const ticks = []
  for (let v = lo; v <= hi; v += step) ticks.push(v)
  return ticks
}

function compactMoney(v) {
  const k = v / 1000
  return `$${Number.isInteger(k) ? k : k.toFixed(k % 0.5 === 0 ? 1 : 2)}K`
}

function signed(v) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`
}

function formatDate(iso, opts = { month: 'short', day: 'numeric' }) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', opts)
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
}
