import styles from './Methodology.module.css'

const SYSTEM_PROMPT = `You are a market analyst participating in a daily AI prediction experiment.
Your task: Research current market conditions using your internet access,
then make 3-5 specific, falsifiable stock market predictions for today.

RULES:
1. You MUST research current pre-market data, overnight futures, recent news,
   and any relevant economic events before making predictions.
2. Each prediction must include: ticker symbol, direction (up/down),
   a specific target price, a timeframe, a confidence level (0.50-0.95),
   and 2-3 sentences of reasoning.
3. At least ONE prediction must be on a major index: SPY, QQQ, or DIA.
4. Be honest about your confidence. 0.50 means you're guessing.
   0.90+ means you see very strong signals.
5. You are scored on accuracy. High-confidence wrong calls are penalized heavily.
   Low-confidence correct calls earn little. Be calibrated.
6. Your reasoning should reference specific data points, news, or technicals
   you found during your research.

Today's date: {date}
Market opens at 9:30 AM ET.

Respond with ONLY valid JSON in the exact schema provided.`

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
            <span className={styles.scheduleTime}>8:30 AM ET</span>
            <span className={styles.scheduleLabel}>Predictions Generated</span>
            <p className={styles.scheduleDesc}>Each model receives the same base prompt and researches current market conditions before predicting.</p>
          </div>
          <div className={styles.scheduleCard}>
            <span className={styles.scheduleTime}>5:30 PM ET</span>
            <span className={styles.scheduleLabel}>Predictions Scored</span>
            <p className={styles.scheduleDesc}>Actual closing prices fetched via yfinance. All end-of-day predictions scored and leaderboard updated.</p>
          </div>
          <div className={styles.scheduleCard}>
            <span className={styles.scheduleTime}>Saturday</span>
            <span className={styles.scheduleLabel}>Weekly Report</span>
            <p className={styles.scheduleDesc}>AI-generated narrative recap of the week's predictions, scores, and highlights published to the Weekly page.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Scoring Formula</h2>
        <div className={styles.formulaBox}>
          <div className={styles.formula}>
            <span className={styles.formulaLine}><span className={styles.correct}>Direction correct:</span>  +1 × confidence</span>
            <span className={styles.formulaLine}><span className={styles.wrong}>Direction wrong:</span>    −1 × confidence</span>
            <span className={styles.formulaLine}><span className={styles.bonus}>Bonus:</span>             +0.5 if actual close within 1% of target price</span>
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
        <h2 className={styles.h2}>System Prompt</h2>
        <p className={styles.sectionDesc}>
          All models receive the same base prompt. Each model's API is called with internet/search access enabled.
        </p>
        <pre className={styles.promptBlock}>{SYSTEM_PROMPT}</pre>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>API Configuration</h2>
        <div className={styles.apiGrid}>
          {[
            { model: 'Claude', api: 'Anthropic Messages API', search: 'web_search tool enabled', note: 'Anthropic\'s native web search tool' },
            { model: 'Perplexity', api: 'Perplexity Chat Completions', search: 'Default (always on)', note: 'Sonar Pro searches by default' },
            { model: 'Gemini', api: 'Google generateContent', search: 'google_search_retrieval grounding', note: 'Google Search grounding tool' },
            { model: 'GPT-4o', api: 'OpenAI Chat Completions', search: 'web_search tool enabled', note: 'OpenAI\'s native web search tool' },
            { model: 'Grok', api: 'xAI Chat Completions', search: 'Search enabled', note: 'Native X/Twitter + web access' },
          ].map(api => (
            <div key={api.model} className={styles.apiCard}>
              <span className={styles.apiModel}>{api.model}</span>
              <span className={styles.apiEndpoint}>{api.api}</span>
              <span className={styles.apiSearch}>{api.search}</span>
              <span className={styles.apiNote}>{api.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Market Data</h2>
        <p className={styles.sectionDesc}>
          Actual closing prices are fetched via <code className={styles.code}>yfinance</code>,
          the Yahoo Finance Python library, run after market close at 5:30 PM ET.
          Only officially listed tickers are used. Data is cached to prevent duplicate fetches.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Limitations & Disclaimer</h2>
        <div className={styles.disclaimer}>
          <p>⚠️ This is a personal experiment and art project. Nothing here constitutes financial advice.</p>
          <ul className={styles.disclaimerList}>
            <li>Models may have knowledge of their own training data which could bias predictions.</li>
            <li>Internet access quality varies between APIs — some may get better real-time data.</li>
            <li>The scoring period is short — accuracy statistics have high variance with small sample sizes.</li>
            <li>Market prediction is hard. Even with perfect information, predicting short-term price movements is extremely difficult.</li>
            <li>The interesting result is the relative comparison between models, not the absolute performance.</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
