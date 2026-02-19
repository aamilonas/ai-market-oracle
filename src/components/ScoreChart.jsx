import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#161616',
      border: '1px solid #262626',
      borderRadius: 8,
      padding: '0.625rem 0.875rem',
    }}>
      <p style={{ color: '#888', fontSize: '0.75rem', marginBottom: '0.35rem' }}>{label}</p>
      {payload.map(entry => (
        <p key={entry.name} style={{
          color: entry.color,
          fontSize: '0.8rem',
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          {entry.name}: {entry.value >= 0 ? '+' : ''}{entry.value.toFixed(1)}
        </p>
      ))}
    </div>
  )
}

export default function ScoreChart({ models }) {
  // Build weekly data points from models' weekly_scores
  const weekSet = new Set()
  models.forEach(m => m.weekly_scores?.forEach(w => weekSet.add(w.week)))
  const weeks = [...weekSet].sort()

  const data = weeks.map(week => {
    const point = { week: week.replace('2025-', '') }
    models.forEach(m => {
      const ws = m.weekly_scores?.find(w => w.week === week)
      point[m.model_display_name] = ws?.score ?? null
    })
    return point
  })

  // Build cumulative scores
  const cumulative = {}
  models.forEach(m => { cumulative[m.model_display_name] = 0 })
  const cumulativeData = data.map(point => {
    const cp = { week: point.week }
    models.forEach(m => {
      const name = m.model_display_name
      if (point[name] !== null) cumulative[name] += point[name]
      cp[name] = parseFloat(cumulative[name].toFixed(2))
    })
    return cp
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={cumulativeData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
        <XAxis
          dataKey="week"
          tick={{ fill: '#555', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#555', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }}
          iconType="circle"
          iconSize={8}
        />
        {models.map(m => (
          <Line
            key={m.model_display_name}
            type="monotone"
            dataKey={m.model_display_name}
            stroke={m.color}
            strokeWidth={2}
            dot={{ r: 3, fill: m.color }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
