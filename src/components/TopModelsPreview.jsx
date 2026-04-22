import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { loadLeaderboard, MODEL_COLORS } from '../data/useData'
import styles from './TopModelsPreview.module.css'

export default function TopModelsPreview() {
  const [models, setModels] = useState(null)

  useEffect(() => {
    loadLeaderboard()
      .then(d => {
        const sorted = [...d.models].sort((a, b) => b.total_score - a.total_score).slice(0, 3)
        setModels(sorted)
      })
      .catch(() => setModels([]))
  }, [])

  if (!models) {
    return <div className={styles.loading}>Loading leaderboard…</div>
  }
  if (models.length === 0) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>Live Leaderboard</h3>
        <Link to="/leaderboard" className={styles.link}>
          Full board <ArrowRight size={14} />
        </Link>
      </div>

      <div className={styles.list}>
        {models.map((m, i) => {
          const color = MODEL_COLORS[m.model_display_name] || '#888'
          const positive = m.total_score >= 0
          return (
            <Link
              key={m.model_display_name}
              to={`/model/${m.model_display_name.toLowerCase().replace('-', '')}`}
              className={styles.row}
            >
              <span className={styles.rank}>0{i + 1}</span>
              <span className={styles.modelName}>
                <span className={styles.dot} style={{ background: color }} />
                {m.model_display_name}
              </span>
              <span className={styles.stat}>
                <span className={styles.statLabel}>Score</span>
                <span className={positive ? styles.scorePos : styles.scoreNeg}>
                  {positive ? '+' : ''}{m.total_score.toFixed(1)}
                </span>
              </span>
              <span className={styles.stat}>
                <span className={styles.statLabel}>Accuracy</span>
                <span className={styles.statValue}>
                  {(m.direction_accuracy * 100).toFixed(1)}%
                </span>
              </span>
              <span className={styles.stat}>
                <span className={styles.statLabel}>Predictions</span>
                <span className={styles.statValue}>{m.total_predictions}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
