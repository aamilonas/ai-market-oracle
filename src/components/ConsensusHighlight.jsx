import styles from './ConsensusHighlight.module.css'

export default function ConsensusHighlight({ consensus }) {
  if (!consensus?.length) return null
  return (
    <div className={styles.wrapper}>
      {consensus.map((item, i) => {
        const isAgreement = item.agreed_direction && item.models_agreeing?.length >= 2
        const isDisagreement = item.agreed_direction === 'disagree'
        return (
          <div
            key={i}
            className={[
              styles.item,
              isAgreement && !isDisagreement ? styles.agree : '',
              isDisagreement ? styles.disagree : '',
            ].join(' ')}
          >
            <div className={styles.header}>
              <span className={styles.ticker}>{item.ticker}</span>
              {!isDisagreement && (
                <span className={[
                  styles.dirBadge,
                  item.agreed_direction === 'up' ? styles.up : styles.down,
                ].join(' ')}>
                  {item.agreed_direction === 'up' ? '▲' : '▼'} {item.agreed_direction?.toUpperCase()}
                </span>
              )}
              {isDisagreement && (
                <span className={styles.splitBadge}>⚡ SPLIT</span>
              )}
              {item.outcome === 'correct' && <span className={styles.outcomeBadge}>✓ Correct</span>}
              {item.outcome === 'wrong' && <span className={styles.outcomeBadgeBad}>✗ Wrong</span>}
            </div>
            <p className={styles.models}>
              {isDisagreement ? 'Models disagree' : `${item.models_agreeing?.join(', ')} agree`}
            </p>
            {item.note && <p className={styles.note}>{item.note}</p>}
          </div>
        )
      })}
    </div>
  )
}
