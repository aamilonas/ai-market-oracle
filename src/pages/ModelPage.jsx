import { useState, useEffect } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import PredictionCard from '../components/PredictionCard'
import { loadLeaderboard, loadPredictions, loadScores } from '../data/useData'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import styles from './ModelPage.module.css'

const SEED_DATE = '2025-02-19'

const MODEL_DESCRIPTIONS = {
  claude: 'Powered by Anthropic\'s Claude with web search. Tends toward methodical, data-driven analysis. Favors calibrated confidence over bold calls. Claude rarely exceeds 80% confidence and shows strong Brier score calibration.',
  perplexity: 'Uses Perplexity Sonar Pro with real-time web search. Often surfaces data others miss. Strong on macro context and sector analysis. Perplexity\'s search-first approach gives it an edge on news-driven events.',
  gemini: 'Google Gemini with Search grounding. Draws on Google\'s vast search index for real-time data. Strong pattern recognition across sectors. High conviction on post-earnings calls.',
  'gpt-4o': 'OpenAI\'s GPT-4o with web browsing. Comprehensive analysis style. Strong fundamental reasoning with balanced risk assessment. GPT-4o favors consensus views but adjusts when data disagrees.',
  grok: 'xAI\'s Grok with native X/Twitter access. Unique sentiment signal from social data. Contrarian streak — fades retail consensus positions. Uses options flow data and short interest to supplement analysis.',
}

export default function ModelPage() {
  const { name } = useParams()
  const [model, setModel] = useState(null)
  const [predData, setPredData] = useState(null)
  const [scores, setScores] = useState(null)
  const [loading, setLoading] = useState(true)

  const slug = name === 'gpt-4o' ? 'gpt4o' : name

  useEffect(() => {
    async function load() {
      try {
        const [lb, pd, sc] = await Promise.all([
          loadLeaderboard(),
          loadPredictions(SEED_DATE, slug).catch(() => null),
          loadScores(SEED_DATE).catch(() => null),
        ])
        const m = lb.models.find(
          m => m.model_display_name.toLowerCase() === name ||
               m.model_display_name.toLowerCase().replace('-', '') === name
        )
        setModel(m)
        setPredData(pd)
        setScores(sc)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [name, slug])

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!model) return <div className={styles.loading}>Model not found.</div>

  const scoreMap = {}
  scores?.results?.forEach(r => { scoreMap[r.prediction_id] = r })

  // Build chart data from weekly scores
  const chartData = model.weekly_scores?.map(w => {
    let cum = 0
    model.weekly_scores.slice(0, model.weekly_scores.indexOf(w) + 1).forEach(ww => { cum += ww.score })
    return {
      week: w.week.replace('2025-', ''),
      score: parseFloat(cum.toFixed(2)),
      weekly: w.score,
      accuracy: parseFloat((w.accuracy * 100).toFixed(1)),
    }
  }) ?? []

  const desc = MODEL_DESCRIPTIONS[name] || ''

  return (
    <div className={styles.page}>
      <NavLink to="/" className={styles.back}>← Dashboard</NavLink>

      <div className={styles.header}>
        <span className={styles.dot} style={{ background: model.color }} />
        <div>
          <h1 className={styles.title}>{model.model_display_name}</h1>
          <p className={styles.modelId}>{model.model_id}</p>
        </div>
        <div className={styles.bigScore} style={{ color: model.color }}>
          <span className={styles.bigScoreLabel}>Total Score</span>
          <span className={['mono', styles.bigScoreValue].join(' ')}>
            {model.total_score >= 0 ? '+' : ''}{model.total_score.toFixed(1)}
          </span>
        </div>
      </div>

      <p className={styles.description}>{desc}</p>

      {/* Stats row */}
      <div className={styles.statsRow}>
        {[
          { label: 'Direction Accuracy', value: `${(model.direction_accuracy * 100).toFixed(1)}%` },
          { label: 'Total Predictions', value: model.total_predictions },
          { label: 'Avg Confidence', value: `${(model.avg_confidence * 100).toFixed(0)}%` },
          { label: 'Current Streak', value: (model.current_streak >= 0 ? '+' : '') + model.current_streak },
          { label: 'Best Streak', value: '+' + model.best_streak },
          { label: 'Worst Streak', value: model.worst_streak },
        ].map(({ label, value }) => (
          <div key={label} className={styles.stat}>
            <span className={styles.statLabel}>{label}</span>
            <span className={['mono', styles.statValue].join(' ')}>{value}</span>
          </div>
        ))}
      </div>

      {/* Cumulative score chart */}
      {chartData.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Cumulative Score</h2>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis dataKey="week" tick={{ fill: '#555', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#161616', border: '1px solid #262626', borderRadius: 8 }}
                  labelStyle={{ color: '#888', fontSize: 11 }}
                  itemStyle={{ color: model.color, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}
                />
                <Line type="monotone" dataKey="score" stroke={model.color} strokeWidth={2} dot={{ r: 4, fill: model.color }} name="Cumulative" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Today's predictions */}
      {predData && (
        <section>
          <h2 className={styles.sectionTitle}>Today's Predictions — {SEED_DATE}</h2>
          <p className={styles.context}>{predData.market_context}</p>
          <div className={styles.cardGrid}>
            {predData.predictions.map(pred => (
              <PredictionCard key={pred.id} prediction={pred} score={scoreMap[pred.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Weekly history table */}
      {model.weekly_scores?.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Weekly History</h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Week</th>
                  <th className={styles.th}>Score</th>
                  <th className={styles.th}>Predictions</th>
                  <th className={styles.th}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {[...model.weekly_scores].reverse().map(w => (
                  <tr key={w.week} className={styles.tr}>
                    <td className={styles.td}><span className="mono">{w.week}</span></td>
                    <td className={styles.td}>
                      <span className={['mono', w.score >= 0 ? styles.pos : styles.neg].join(' ')}>
                        {w.score >= 0 ? '+' : ''}{w.score.toFixed(1)}
                      </span>
                    </td>
                    <td className={styles.td}><span className="mono">{w.predictions}</span></td>
                    <td className={styles.td}><span className="mono">{(w.accuracy * 100).toFixed(1)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
