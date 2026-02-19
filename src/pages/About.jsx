import styles from './About.module.css'

export default function About() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About</h1>

      <section className={styles.section}>
        <h2 className={styles.h2}>What is this?</h2>
        <p>
          AI Market Oracle is a daily experiment that asks five different AI models —
          each with internet access — to make specific, falsifiable stock market predictions
          every weekday before market open. After the closing bell, predictions are scored
          against real market data.
        </p>
        <p>
          Over time, a leaderboard emerges showing which AI model is the most accurate
          market forecaster. The results are updated automatically via GitHub Actions
          with no human intervention after initial deployment.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Why build this?</h2>
        <p>
          This project sits at the intersection of several things I find interesting:
        </p>
        <ul className={styles.list}>
          <li>AI model comparison with real-world, measurable outcomes</li>
          <li>Market prediction as a domain where overconfidence is uniquely punishing</li>
          <li>Automated systems that run indefinitely without human babysitting</li>
          <li>The question: does internet access actually help AI models be right about things?</li>
        </ul>
        <p>
          The interesting result isn't whether any model beats the market — they probably won't
          consistently. The interesting result is the <em>relative</em> comparison: which models
          are better calibrated? Which ones are overconfident? Which ones surface information
          others miss?
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Models Competing</h2>
        <div className={styles.modelList}>
          {[
            { name: 'Claude', color: '#E07A3A', model: 'claude-sonnet-4-20250514', org: 'Anthropic' },
            { name: 'Perplexity', color: '#20B2AA', model: 'sonar-pro', org: 'Perplexity AI' },
            { name: 'Gemini', color: '#4285F4', model: 'gemini-2.0-flash', org: 'Google DeepMind' },
            { name: 'GPT-4o', color: '#10A37F', model: 'gpt-4o', org: 'OpenAI' },
            { name: 'Grok', color: '#C0C0C0', model: 'grok-2', org: 'xAI' },
          ].map(m => (
            <div key={m.name} className={styles.modelRow}>
              <span className={styles.modelDot} style={{ background: m.color }} />
              <div>
                <span className={styles.modelName}>{m.name}</span>
                <span className={styles.modelOrg}>{m.org}</span>
              </div>
              <span className={['mono', styles.modelId].join(' ')}>{m.model}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Tech Stack</h2>
        <div className={styles.stackGrid}>
          {[
            { label: 'Frontend', value: 'React + Vite, deployed to GitHub Pages' },
            { label: 'Automation', value: 'Python scripts via GitHub Actions (3 cron jobs)' },
            { label: 'Data', value: 'JSON files committed directly to the repo — no database' },
            { label: 'Market Data', value: 'yfinance (Yahoo Finance Python library)' },
            { label: 'Charts', value: 'Recharts' },
            { label: 'Cost', value: '~$1-3/day across all API calls' },
          ].map(s => (
            <div key={s.label} className={styles.stackRow}>
              <span className={styles.stackLabel}>{s.label}</span>
              <span className={styles.stackValue}>{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Source & Follow Along</h2>
        <p>
          The full source code is on GitHub. Pull requests and issues welcome.
        </p>
        <div className={styles.links}>
          <a
            href="https://github.com"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub Repository →
          </a>
        </div>
        <p className={styles.disclaimer}>
          ⚠️ Nothing on this site constitutes financial advice. This is a personal experiment.
          Do not make investment decisions based on AI model predictions from this site.
        </p>
      </section>
    </div>
  )
}
