import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './LeaderboardTable.module.css'

function StreakBadge({ streak }) {
  if (streak === 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const isHot = streak > 0
  return (
    <span className={isHot ? styles.streakHot : styles.streakCold}>
      {isHot ? '🔥' : '🧊'} {isHot ? '+' : ''}{streak}
    </span>
  )
}

const SORT_KEYS = ['total_score', 'direction_accuracy', 'total_predictions', 'avg_confidence']

export default function LeaderboardTable({ models, compact = false }) {
  const [sortKey, setSortKey] = useState('total_score')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = [...models].sort((a, b) => {
    const v = sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
    return v
  })

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span style={{ color: 'var(--text-muted)' }}> ↕</span>
    return <span style={{ color: 'var(--text-primary)' }}> {sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Rank</th>
            <th className={styles.th}>Model</th>
            <th
              className={[styles.th, styles.sortable].join(' ')}
              onClick={() => handleSort('total_score')}
            >
              Score<SortIcon k="total_score" />
            </th>
            <th
              className={[styles.th, styles.sortable].join(' ')}
              onClick={() => handleSort('direction_accuracy')}
            >
              Accuracy<SortIcon k="direction_accuracy" />
            </th>
            {!compact && (
              <>
                <th
                  className={[styles.th, styles.sortable].join(' ')}
                  onClick={() => handleSort('total_predictions')}
                >
                  Predictions<SortIcon k="total_predictions" />
                </th>
                <th
                  className={[styles.th, styles.sortable].join(' ')}
                  onClick={() => handleSort('avg_confidence')}
                >
                  Avg Confidence<SortIcon k="avg_confidence" />
                </th>
                <th className={styles.th}>Streak</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((model, i) => (
            <tr key={model.model_display_name} className={styles.row}>
              <td className={styles.td}>
                <span className={styles.rank}>{i + 1}</span>
              </td>
              <td className={styles.td}>
                <NavLink to={`/model/${model.model_display_name.toLowerCase()}`} className={styles.modelLink}>
                  <span
                    className={styles.modelDot}
                    style={{ background: model.color }}
                  />
                  <span className={styles.modelName}>{model.model_display_name}</span>
                </NavLink>
              </td>
              <td className={styles.td}>
                <span className={['mono', styles.score].join(' ')}>
                  {model.total_score >= 0 ? '+' : ''}{model.total_score.toFixed(1)}
                </span>
              </td>
              <td className={styles.td}>
                <div className={styles.accuracyCell}>
                  <span className="mono">{(model.direction_accuracy * 100).toFixed(1)}%</span>
                  <div className={styles.accuracyBar}>
                    <div
                      className={styles.accuracyFill}
                      style={{
                        width: `${model.direction_accuracy * 100}%`,
                        background: model.color,
                      }}
                    />
                  </div>
                </div>
              </td>
              {!compact && (
                <>
                  <td className={styles.td}>
                    <span className="mono">{model.total_predictions}</span>
                  </td>
                  <td className={styles.td}>
                    <span className="mono">{(model.avg_confidence * 100).toFixed(0)}%</span>
                  </td>
                  <td className={styles.td}>
                    <StreakBadge streak={model.current_streak} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
