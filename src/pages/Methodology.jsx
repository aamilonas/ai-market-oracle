import { ACTIVE_MODELS, WEB_SEARCH_LABELS } from '../data/useData'
import SYSTEM_PROMPT from '../../scripts/prompts/prediction_system.txt?raw'
import USER_PROMPT from '../../scripts/prompts/prediction_user.txt?raw'
import styles from './Methodology.module.css'

export default function Methodology() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Methodology</h1>
      <p className={styles.intro}>
        Full transparency on how predictions are generated, scored, and displayed.
        This is an experiment — not financial advice.
      </p>

      <section className={styles.section}>
        <h2 className={styles.h2}>Schedule</h2>
        <div className={styles.scheduleGrid}>
          <div className={styles.scheduleCard}>
            <span className={styles.scheduleTime}>Morning</span>
            <span className={styles.scheduleLabel}>Predictions Generated</span>
            <p className={styles.scheduleDesc}>All {ACTIVE_MODELS.length} models are queried in parallel with the identical prompt, built around a single Yahoo Finance snapshot taken before any model is called.</p>
          </div>
          <div className={styles.scheduleCard}>
            <span className={styles.scheduleTime}>5:30 PM ET</span>
            <span className={styles.scheduleLabel}>Predictions Scored</span>
            <p className={styles.scheduleDesc}>Closing prices fetched via yfinance. Each call is scored on whether the close moved in the predicted direction from that morning&apos;s snapshot price.</p>
          </div>
          <div className={styles.scheduleCard}>
            <span className={styles.scheduleTime}>Saturday</span>
            <span className={styles.scheduleLabel}>Weekly Report</span>
            <p className={styles.scheduleDesc}>AI-generated narrative recap of the week&apos;s predictions, scores, and highlights published to the Weekly page.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Scoring Formula</h2>
        <div className={styles.formulaBox}>
          <div className={styles.formula}>
            <span className={styles.formulaLine}><span className={styles.correct}>Direction correct:</span>  +1 × confidence</span>
            <span className={styles.formulaLine}><span className={styles.wrong}>Direction wrong:</span>    −1 × confidence</span>
            <span className={styles.formulaLine}><span className={styles.bonus}>Bonus:</span>             +0.5 if direction correct and close within 1% of target</span>
          </div>
        </div>
        <div className={styles.examples}>
          <p className={styles.examplesTitle}>Examples</p>
          <div className={styles.exampleGrid}>
            {[
              { label: 'High-confidence correct', conf: '0.85', result: 'correct', score: '+0.85 pts', bonus: 'No bonus', note: 'Rewarded for conviction' },
              { label: 'High-confidence + accurate target', conf: '0.85', result: 'correct', score: '+1.35 pts', bonus: '+0.50 bonus', note: 'Within 1% of target' },
              { label: 'High-confidence wrong', conf: '0.85', result: 'wrong', score: '−0.85 pts', bonus: 'No bonus', note: 'Heavy penalty for overconfidence' },
              { label: 'Low-confidence correct', conf: '0.52', result: 'correct', score: '+0.52 pts', bonus: 'No bonus', note: 'Hedging earns little' },
            ].map(ex => (
              <div key={ex.label} className={styles.exampleCard}>
                <span className={styles.exLabel}>{ex.label}</span>
                <div className={styles.exDetails}>
                  <span>Confidence: <span className="mono">{ex.conf}</span></span>
                  <span>Result: <span className={ex.result === 'correct' ? styles.correct : styles.wrong}>{ex.result}</span></span>
                  <span>Score: <span className="mono">{ex.score}</span></span>
                  {ex.bonus !== 'No bonus' && <span className={styles.bonus}>{ex.bonus}</span>}
                </div>
                <p className={styles.exNote}>{ex.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Prompt</h2>
        <p className={styles.sectionDesc}>
          Every model receives exactly this prompt — the same files the automation reads.
          The market data block is filled in each morning with one Yahoo Finance snapshot: for each
          ticker the live price, the previous close, the move so far today, the day&apos;s range and the
          5-day change, plus any earnings reported within a day either side, and FRED macro indicators.
        </p>
        <pre className={styles.promptBlock}>{SYSTEM_PROMPT}</pre>
        <pre className={styles.promptBlock}>{USER_PROMPT}</pre>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Model Configuration</h2>
        <p className={styles.sectionDesc}>
          Every model is called through OpenRouter with web search enabled. Models without a native search
          tool research through OpenRouter&apos;s Exa search instead; the engine used is recorded on every prediction file.
        </p>
        <div className={styles.apiGrid}>
          {ACTIVE_MODELS.map(m => (
            <div key={m.slug} className={styles.apiCard}>
              <span className={styles.apiModel} style={{ color: m.color }}>{m.display_name}</span>
              <span className={styles.apiEndpoint}>{m.openrouter_model}</span>
              <span className={styles.apiSearch}>{WEB_SEARCH_LABELS[m.web_search] || m.web_search}</span>
              <span className={styles.apiNote}>{m.org}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Market Data</h2>
        <p className={styles.sectionDesc}>
          Prices come from <code className={styles.code}>yfinance</code>, the Yahoo Finance Python library.
          One snapshot is taken before any model is called, and that same snapshot is both shown in the prompt
          and used as the scoring baseline — so every model is judged against the identical number, and the
          price a model reasoned from is the price it is scored against. A model&apos;s own reported price is
          stored separately and never used for scoring, so stale or invented prices can&apos;t inflate a score.
          Each price is labelled with the previous close beside it, so a gap or news-driven move that has
          already happened is visible rather than something a model has to infer. If a model predicts a
          ticker outside the snapshot, its live price is fetched once and shared across all models.
          Closing prices are fetched after the 4:00 PM ET close.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Limitations & Disclaimer</h2>
        <div className={styles.disclaimer}>
          <p>⚠️ This is a personal experiment and art project. Nothing here constitutes financial advice.</p>
          <ul className={styles.disclaimerList}>
            <li>Models may have knowledge of their own training data which could bias predictions.</li>
            <li>Search quality varies — native provider search and Exa search can surface different sources.</li>
            <li>Models on the same search engine often receive the same sources, so when they agree it can reflect a shared information diet rather than independent judgement. Committee results should be read with that in mind.</li>
            <li>The scoring period is short — accuracy statistics have high variance with small sample sizes.</li>
            <li>Market prediction is hard. Even with perfect information, predicting short-term price movements is extremely difficult.</li>
            <li>The interesting result is the relative comparison between models, not the absolute performance.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
