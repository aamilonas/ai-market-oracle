import styles from './WeeklySummary.module.css'

export default function WeeklySummary({ weekly }) {
  if (!weekly) return null
  const { headline, summary, scores, best_call, worst_call, consensus_accuracy, period } = weekly
  return (
    <div className={styles.wrapper}>
      <div className={styles.meta}>
        <span className={styles.week}>{weekly.week}</span>
        <span className={styles.period}>{period}</span>
      </div>
      <h2 className={styles.headline}>{headline}</h2>
      <p className={styles.summary}>{summary}</p>

      <div className={styles.callGrid}>
        {best_call && (
          <div className={[styles.callCard, styles.best].join(' ')}>
            <span className={styles.callLabel}>Best Call</span>
            <span className={styles.callModel}>{best_call.model}</span>
            <span className={styles.callTicker}>{best_call.ticker}</span>
            <span className={['mono', styles.callScore].join(' ')}>
              +{best_call.score.toFixed(2)} pts
            </span>
            <p className={styles.callSummary}>{best_call.summary}</p>
          </div>
        )}
        {worst_call && (
          <div className={[styles.callCard, styles.worst].join(' ')}>
            <span className={styles.callLabel}>Worst Call</span>
            <span className={styles.callModel}>{worst_call.model}</span>
            <span className={styles.callTicker}>{worst_call.ticker}</span>
            <span className={['mono', styles.callScoreNeg].join(' ')}>
              {worst_call.score.toFixed(2)} pts
            </span>
            <p className={styles.callSummary}>{worst_call.summary}</p>
          </div>
        )}
      </div>

      {consensus_accuracy && (
        <div className={styles.consensus}>
          <span className={styles.consLabel}>Consensus Accuracy</span>
          <span className={['mono', styles.consValue].join(' ')}>
            {consensus_accuracy.consensus_correct}/{consensus_accuracy.total_consensus_calls}
            {' '}({(consensus_accuracy.accuracy * 100).toFixed(0)}%)
          </span>
        </div>
      )}
    </div>
  )
}
