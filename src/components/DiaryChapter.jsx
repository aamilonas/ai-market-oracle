import styles from './DiaryChapter.module.css'

export default function DiaryChapter({ chapter }) {
  if (!chapter) return null
  const { date, day_name, headline, stock_highlights, crypto_highlight, sports_highlight, top_scorer, narrative } = chapter

  return (
    <div className={styles.chapter}>
      <div className={styles.timeline}>
        <div className={styles.dot} />
        <div className={styles.line} />
      </div>
      <div className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.dayName}>{day_name}</span>
          <span className={styles.date}>{date}</span>
          {top_scorer && <span className={styles.topScorer}>Top: {top_scorer}</span>}
        </div>
        <h3 className={styles.headline}>{headline}</h3>
        <p className={styles.narrative}>{narrative}</p>
        <div className={styles.highlights}>
          {stock_highlights && (
            <div className={styles.highlight}>
              <span className={styles.highlightLabel} style={{ color: '#4a9eff' }}>Stocks</span>
              <span className={styles.highlightText}>{stock_highlights}</span>
            </div>
          )}
          {crypto_highlight && (
            <div className={styles.highlight}>
              <span className={styles.highlightLabel} style={{ color: '#f7931a' }}>Crypto</span>
              <span className={styles.highlightText}>{crypto_highlight}</span>
            </div>
          )}
          {sports_highlight && (
            <div className={styles.highlight}>
              <span className={styles.highlightLabel} style={{ color: '#22c55e' }}>Sports</span>
              <span className={styles.highlightText}>{sports_highlight}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
