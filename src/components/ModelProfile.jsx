import { NavLink } from 'react-router-dom'
import styles from './ModelProfile.module.css'

const MODEL_DESCRIPTIONS = {
  Claude: 'Powered by Anthropic\'s Claude with web search. Tends toward methodical, data-driven analysis. Favors calibrated confidence over bold calls.',
  Perplexity: 'Uses Perplexity Sonar Pro with real-time web search. Often surfaces data others miss. Strong on macro context and sector analysis.',
  Gemini: 'Google Gemini with Search grounding. Draws on Google\'s search index for real-time data. Strong pattern recognition across sectors.',
  'GPT-4o': 'OpenAI\'s GPT-4o with web browsing. Comprehensive analysis style. Strong fundamental reasoning with balanced risk assessment.',
  Grok: 'xAI\'s Grok with native X/Twitter access. Unique sentiment signal from social data. Contrarian streak — fades retail consensus positions.',
}

export default function ModelProfile({ model }) {
  const description = MODEL_DESCRIPTIONS[model.model_display_name] || ''
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.dot} style={{ background: model.color }} />
        <div>
          <NavLink to={`/model/${model.model_display_name.toLowerCase()}`} className={styles.name}>
            {model.model_display_name}
          </NavLink>
          <p className={styles.modelId}>{model.model_id}</p>
        </div>
      </div>
      <p className={styles.description}>{description}</p>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Score</span>
          <span className={['mono', styles.statValue].join(' ')} style={{ color: model.color }}>
            {model.total_score >= 0 ? '+' : ''}{model.total_score.toFixed(1)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Accuracy</span>
          <span className={['mono', styles.statValue].join(' ')}>
            {(model.direction_accuracy * 100).toFixed(1)}%
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Predictions</span>
          <span className={['mono', styles.statValue].join(' ')}>{model.total_predictions}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Streak</span>
          <span className={['mono', styles.statValue].join(' ')}
            style={{ color: model.current_streak >= 0 ? '#22c55e' : '#ef4444' }}>
            {model.current_streak >= 0 ? '+' : ''}{model.current_streak}
          </span>
        </div>
      </div>
    </div>
  )
}
