import styles from './PredictionCard.module.css'

function DirectionBadge({ direction, correct }) {
  const icon = direction === 'up' ? '▲' : '▼'
  const colorClass =
    correct === true ? styles.correct : correct === false ? styles.wrong : styles.pending
  return (
    <span className={[styles.badge, colorClass].join(' ')}>
      {icon} {direction.toUpperCase()}
    </span>
  )
}

export default function PredictionCard({ prediction, score, compact }) {
  const {
    ticker,
    direction,
    target_price,
    current_price_at_prediction,
    timeframe,
    confidence,
    reasoning,
  } = prediction

  const pct = (((target_price - current_price_at_prediction) / current_price_at_prediction) * 100)
  const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
  const timeframeLabel = {
    end_of_day: 'EOD',
    end_of_week: 'EOW',
    end_of_month: 'EOM',
  }[timeframe] || timeframe

  const isResolved = score?.status === 'resolved'
  const correct = isResolved ? score.direction_correct : undefined

  return (
    <div className={[styles.card, isResolved && correct ? styles.won : isResolved && !correct ? styles.lost : ''].join(' ')}>
      <div className={styles.header}>
        <div className={styles.tickerRow}>
          <span className={styles.ticker}>{ticker}</span>
          <DirectionBadge direction={direction} correct={correct} />
          <span className={styles.timeframe}>{timeframeLabel}</span>
        </div>
        {isResolved && (
          <span className={[styles.scoreChip, score.score >= 0 ? styles.scorePos : styles.scoreNeg].join(' ')}>
            {score.score >= 0 ? '+' : ''}{score.score.toFixed(2)} pts
          </span>
        )}
      </div>

      <div className={styles.prices}>
        <div className={styles.priceGroup}>
          <span className={styles.priceLabel}>Entry</span>
          <span className={[styles.priceValue, 'mono'].join(' ')}>
            ${current_price_at_prediction.toFixed(2)}
          </span>
        </div>
        <div className={styles.arrow}>→</div>
        <div className={styles.priceGroup}>
          <span className={styles.priceLabel}>Target</span>
          <span className={[styles.priceValue, 'mono'].join(' ')}>
            ${target_price.toFixed(2)}
          </span>
        </div>
        <span className={[styles.pct, direction === 'up' ? styles.up : styles.down].join(' ')}>
          {pctStr}
        </span>
        {isResolved && (
          <>
            <div className={styles.arrow}>•</div>
            <div className={styles.priceGroup}>
              <span className={styles.priceLabel}>Actual</span>
              <span className={[styles.priceValue, 'mono'].join(' ')}>
                ${score.actual_close.toFixed(2)}
              </span>
            </div>
          </>
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

      {!compact && <p className={styles.reasoning}>{reasoning}</p>}
    </div>
  )
}
