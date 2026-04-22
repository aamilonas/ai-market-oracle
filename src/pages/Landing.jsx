import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

const stats = [
  { value: '83%', label: 'Trade Win Rate' },
  { value: '+20%', label: 'Gains/Month on Average' },
  { value: '5', label: 'AI Models Working For You' },
  { value: '$29/mo', label: 'Full Auto-Trading' },
]

const BASE = import.meta.env.BASE_URL

const brokerages = [
  { name: 'Robinhood', logo: `${BASE}logos/robinhood.svg` },
  { name: 'Charles Schwab', logo: `${BASE}logos/schwab.svg` },
  { name: 'Fidelity', logo: `${BASE}logos/fidelity.svg` },
  { name: 'Webull', logo: `${BASE}logos/webull.svg` },
  { name: 'E*TRADE', logo: `${BASE}logos/etrade.svg` },
  { name: 'Interactive Brokers', logo: `${BASE}logos/interactive-brokers.svg` },
]

const steps = [
  { num: '01', title: 'Connect', desc: 'Link your brokerage account in seconds. We support Robinhood, Schwab, and more.' },
  { num: '02', title: 'Configure', desc: 'Set your risk tolerance, position size, and preferred sectors. We adapt to you.' },
  { num: '03', title: 'Auto-Trade', desc: 'When 3+ AI models agree on a trade, we execute automatically. You stay in control.' },
]

const models = [
  { name: 'Claude', org: 'Anthropic', color: '#E07A3A' },
  { name: 'GPT-4o', org: 'OpenAI', color: '#10A37F' },
  { name: 'Gemini', org: 'Google', color: '#4285F4' },
  { name: 'Perplexity', org: 'Perplexity AI', color: '#20B2AA' },
  { name: 'Grok', org: 'xAI', color: '#C0C0C0' },
]

const tiers = [
  { name: 'Free', price: '$0', period: 'forever', features: ['View daily predictions', 'Public leaderboard', 'Weekly recaps'], cta: 'Get Started', highlighted: false },
  { name: 'Pro', price: '$29', period: '/month', features: ['Auto-trading execution', 'Real-time trade alerts', 'Custom model weighting', 'Full analytics dashboard', 'Priority support'], cta: 'Start Free Trial', highlighted: true },
  { name: 'Institutional', price: '$499', period: '/month', features: ['Everything in Pro', 'API access', 'White-label options', 'Custom model ensemble', 'Dedicated account manager'], cta: 'Contact Sales', highlighted: false },
]

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link to="/" className={styles.navLogo}>
            <span className={styles.logoMark}>◆</span>
            <span>Oracle Trade</span>
          </Link>
          <div className={styles.navLinks}>
            <Link to="/leaderboard" className={styles.navLink}>Leaderboard</Link>
            <Link to="/analytics" className={styles.navLink}>Analytics</Link>
            <Link to="/methodology" className={styles.navLink}>Methodology</Link>
            <Link to="/signup" className={styles.navCta}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={`${styles.heroContent} animate-in`}>
          <h1 className={styles.heroTitle}>Your AI Trading Team</h1>
          <p className={styles.heroSub}>
            5 AI models analyze the market every morning. When 3 or more agree on a trade, we execute it automatically.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/signup" className={styles.btnPrimary}>Get Started</Link>
            <Link to="/leaderboard" className={styles.btnSecondary}>View Live Predictions</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.stats}>
        <div className={`${styles.statsGrid} stagger`}>
          {stats.map(s => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Works With */}
      <section className={styles.partners}>
        <span className={styles.partnersLabel}>Works with</span>
        <div className={styles.marqueeWrap}>
          <div className={styles.marquee}>
            {[...brokerages, ...brokerages].map((b, i) => (
              <div key={i} className={styles.partnerLogo}>
                <img src={b.logo} alt={b.name} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={`${styles.stepsGrid} stagger`}>
          {steps.map(s => (
            <div key={s.num} className={styles.stepCard}>
              <span className={styles.stepNum}>{s.num}</span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Models */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The Models</h2>
        <p className={styles.sectionSub}>Five leading AI models analyze the market independently every morning. We only trade when they agree.</p>
        <div className={`${styles.modelsGrid} stagger`}>
          {models.map(m => (
            <Link to={`/model/${m.name.toLowerCase().replace('-', '')}`} key={m.name} className={styles.modelCard}>
              <span className={styles.modelDot} style={{ background: m.color }} />
              <span className={styles.modelName}>{m.name}</span>
              <span className={styles.modelOrg}>{m.org}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pricing</h2>
        <p className={styles.sectionSub}>Start free. Upgrade when you are ready to auto-trade.</p>
        <div className={`${styles.pricingGrid} stagger`}>
          {tiers.map(t => (
            <div key={t.name} className={`${styles.tierCard} ${t.highlighted ? styles.tierHighlighted : ''}`}>
              {t.highlighted && <span className={styles.tierBadge}>Most Popular</span>}
              <h3 className={styles.tierName}>{t.name}</h3>
              <div className={styles.tierPrice}>
                <span className={styles.tierAmount}>{t.price}</span>
                <span className={styles.tierPeriod}>{t.period}</span>
              </div>
              <ul className={styles.tierFeatures}>
                {t.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <Link to="/signup" className={t.highlighted ? styles.btnPrimary : styles.btnSecondary}>
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>
            <span className={styles.logoMark}>◆</span> Oracle Trade
          </span>
          <span className={styles.footerNote}>Not financial advice. Past performance does not guarantee future results.</span>
        </div>
      </footer>
    </div>
  )
}
