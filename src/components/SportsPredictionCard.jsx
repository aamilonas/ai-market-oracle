import styles from './SportsPredictionCard.module.css'

const SPORT_LABELS = {
  basketball_nba: 'NBA',
  football_nfl: 'NFL',
  baseball_mlb: 'MLB',
  hockey_nhl: 'NHL',
  soccer_epl: 'EPL',
  soccer_mls: 'MLS',
}

export default function SportsPredictionCard({ prediction, score }) {
  const {
    sport,
    matchup,
    predicted_winner,
    confidence,
    reasoning,
  } = prediction

  const sportLabel = SPORT_LABELS[sport] || sport
  const isResolved = score?.status === 'resolved'
  const correct = isResolved ? score.prediction_correct : undefined

  return (
    <div className={[styles.card, isResolved && correct ? styles.won : isResolved && correct === false ? styles.lost : ''].join(' ')}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <span className={styles.sportBadge}>{sportLabel}</span>
          <span className={styles.categoryBadge}>Sports</span>
          {isResolved && (
            <span className={[styles.scoreChip, score.score >= 0 ? styles.scorePos : styles.scoreNeg].join(' ')}>
              {score.score >= 0 ? '+' : ''}{score.score.toFixed(2)} pts
            </span>
          )}
        </div>
      </div>

      <div className={styles.matchup}>{matchup}</div>

      <div className={styles.pick}>
        <span className={styles.pickLabel}>Pick</span>
        <span className={styles.pickValue}>{predicted_winner}</span>
        {isResolved && (
          <span className={correct ? styles.outcomeCorrect : styles.outcomeWrong}>
            {correct ? '✓ Correct' : '✗ Wrong'}
          </span>
        )}
        {isResolved && score.actual_winner && (
          <span className={styles.actualWinner}>Winner: {score.actual_winner}</span>
        )}
      </div>

      <div className={styles.confidence}>
        <span className={styles.confLabel}>Confidence</span>
        <div className={styles.confBar}>
          <div
            className={styles.confFill}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
        <span className={['mono', styles.confValue].join(' ')}>{(confidence * 100).toFixed(0)}%</span>
      </div>

      <p className={styles.reasoning}>{reasoning}</p>
    </div>
  )
}
