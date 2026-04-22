import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Minus } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import LiveTickerStrip from '../components/LiveTickerStrip'
import ConsensusSignalMockup from '../components/ConsensusSignalMockup'
import TopModelsPreview from '../components/TopModelsPreview'
import { loadSimulator, loadAnalytics } from '../data/useData'
import { useCountUp } from '../hooks/useCountUp'
import styles from './Landing.module.css'

const BASE = import.meta.env.BASE_URL

const brokerages = [
  { name: 'Robinhood', logo: `${BASE}logos/robinhood.svg` },
  { name: 'Charles Schwab', logo: `${BASE}logos/schwab.svg` },
  { name: 'Fidelity', logo: `${BASE}logos/fidelity.svg` },
  { name: 'Webull', logo: `${BASE}logos/webull.svg` },
  { name: 'E*TRADE', logo: `${BASE}logos/etrade.svg` },
  { name: 'Interactive Brokers', logo: `${BASE}logos/interactive-brokers.svg` },
]

const tiers = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    features: ['View daily predictions', 'Public leaderboard', 'Weekly recaps', 'Historical backtests'],
    cta: 'Get Started',
    ctaTo: '/signup',
  },
  {
    name: 'Pro',
    price: 29,
    period: '/month',
    features: ['Auto-trading execution', 'Real-time trade alerts', 'Custom model weighting', 'Full analytics dashboard', 'Priority support'],
    cta: 'Start Free Trial',
    ctaTo: '/signup',
    highlighted: true,
  },
  {
    name: 'Institutional',
    price: 499,
    period: '/month',
    features: ['Everything in Pro', 'API access', 'White-label options', 'Custom model ensemble', 'Dedicated account manager'],
    cta: 'Contact Sales',
    ctaTo: '/signup',
  },
]

function HeroStats({ simReturnPct, simWinRate, totalPredictions, scoringDays }) {
  const retAnim = useCountUp(simReturnPct, 900, 2)
  const winAnim = useCountUp(simWinRate, 900, 1)
  const predAnim = useCountUp(totalPredictions, 1000, 0)
  const daysAnim = useCountUp(scoringDays, 800, 0)
  const positive = simReturnPct >= 0

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <span className={styles.statValue} style={{ color: positive ? 'var(--positive)' : 'var(--negative)' }}>
          {positive ? '+' : ''}{retAnim.toFixed(2)}%
        </span>
        <span className={styles.statLabel}>Simulator return</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{winAnim.toFixed(1)}%</span>
        <span className={styles.statLabel}>Win rate on consensus trades</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{predAnim.toLocaleString()}</span>
        <span className={styles.statLabel}>Predictions scored</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statValue}>{daysAnim}</span>
        <span className={styles.statLabel}>Trading days tracked</span>
      </div>
    </div>
  )
}

function FeatureBlock({ eyebrow, title, body, stat, statLabel, bullets, reverse, mockup }) {
  return (
    <section className={`${styles.feature} ${reverse ? styles.featureReverse : ''}`}>
      <div className={styles.featureText}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2 className={styles.featureTitle}>{title}</h2>
        <p className={styles.featureBody}>{body}</p>
        {bullets && (
          <ul className={styles.featureBullets}>
            {bullets.map(b => (
              <li key={b}>
                <Check size={14} strokeWidth={2.5} /> {b}
              </li>
            ))}
          </ul>
        )}
        {stat && (
          <div className={styles.featureStat}>
            <span className={styles.featureStatValue}>{stat}</span>
            <span className={styles.featureStatLabel}>{statLabel}</span>
          </div>
        )}
      </div>
      <div className={styles.featureMockup}>{mockup}</div>
    </section>
  )
}

export default function Landing() {
  const [sim, setSim] = useState(null)
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    loadSimulator().then(setSim).catch(() => setSim(null))
    loadAnalytics().then(setAnalytics).catch(() => setAnalytics(null))
  }, [])

  const simPnl = (sim?.balance ?? 25000) - (sim?.starting_balance ?? 25000)
  const simReturnPct = sim?.starting_balance ? (simPnl / sim.starting_balance) * 100 : 0
  const closed = (sim?.trades ?? []).filter(t => t.status === 'CLOSED')
  const wins = closed.filter(t => (t.pnl ?? 0) > 0).length
  const simWinRate = closed.length ? (wins / closed.length) * 100 : 0
  const totalPredictions = analytics?.data_range?.total_predictions ?? 0
  const scoringDays = analytics?.data_range?.scoring_days ?? 0

  return (
    <div className={styles.page}>
      {/* Ambient grid background */}
      <div className={styles.gridBackground} aria-hidden />
      <div className={styles.radialGlow} aria-hidden />

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
            <ThemeToggle />
            <Link to="/signup" className={styles.navCta}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} />
            Live trading · 4/5 consensus required
          </span>
          <h1 className={styles.heroTitle}>
            The market&apos;s best idea,<br />every morning.
          </h1>
          <p className={styles.heroSub}>
            Five frontier AI models watch the open. When four agree, we trade for you.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/signup" className={styles.btnPrimary}>
              Start free trial <ArrowRight size={16} />
            </Link>
            <Link to="/leaderboard" className={styles.btnSecondary}>See it live</Link>
          </div>
        </div>
        <div className={styles.heroMockup}>
          <ConsensusSignalMockup />
        </div>
      </section>

      {/* Live ticker */}
      <section className={styles.tickerSection}>
        <LiveTickerStrip />
      </section>

      {/* Stats — real numbers */}
      <section className={styles.stats}>
        <HeroStats
          simReturnPct={simReturnPct}
          simWinRate={simWinRate}
          totalPredictions={totalPredictions}
          scoringDays={scoringDays}
        />
      </section>

      {/* Works With */}
      <section className={styles.partners}>
        <h2 className={styles.partnersHeading}>
          Painless integration with your favorite trading tool
        </h2>
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

      {/* Feature blocks — replaces the old 3-card "How It Works" */}
      <FeatureBlock
        eyebrow="01 · Signals"
        title="Consensus, not predictions."
        body="Anyone can call a stock. Our pipeline only acts when four of five frontier models independently arrive at the same call — direction, price, and timeframe."
        bullets={[
          'Claude, GPT-4o, Gemini, Perplexity, Grok — each with internet access',
          'Same prompt, same data, independent analysis',
          'Conviction is scored against reality every single day',
        ]}
        mockup={<ConsensusSignalMockup />}
      />

      <FeatureBlock
        reverse
        eyebrow="02 · Execution"
        title="Connected to your brokerage."
        body="We link your existing account, not a walled-off wallet. Every trade executes through Robinhood, Schwab, Fidelity, or whoever you already trust with your money."
        stat={`${totalPredictions.toLocaleString()}`}
        statLabel="predictions scored to date — publicly, on every trading day"
        mockup={
          <div className={styles.logoCard}>
            <div className={styles.logoCardGrid}>
              {brokerages.map(b => (
                <div key={b.name} className={styles.logoCardItem}>
                  <img src={b.logo} alt={b.name} />
                </div>
              ))}
            </div>
          </div>
        }
      />

      <FeatureBlock
        eyebrow="03 · Receipts"
        title="Every call, on the record."
        body="We publish the full prediction log and a paper-traded portfolio updating live. No cherry-picked highlights, no backtests — just every decision and every outcome."
        mockup={<TopModelsPreview />}
      />

      {/* Pricing */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Pricing</h2>
          <p className={styles.sectionSub}>Start free. Upgrade when you&apos;re ready to auto-trade.</p>
        </div>
        <div className={styles.pricingGrid}>
          {tiers.map(t => (
            <div key={t.name} className={`${styles.tierCard} ${t.highlighted ? styles.tierHighlighted : ''}`}>
              {t.highlighted && <span className={styles.tierBadge}>Most popular</span>}
              <h3 className={styles.tierName}>{t.name}</h3>
              <div className={styles.tierPrice}>
                <span className={styles.tierAmount}>${t.price}</span>
                <span className={styles.tierPeriod}>{t.period}</span>
              </div>
              <div className={styles.tierDivider} />
              <ul className={styles.tierFeatures}>
                {t.features.map(f => (
                  <li key={f}>
                    <Minus size={12} strokeWidth={2.5} className={styles.tierBullet} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={t.ctaTo}
                className={t.highlighted ? styles.btnPrimary : styles.btnSecondary}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className={styles.pricingNote}>
          Cancel anytime. No credit card required for the free tier.
        </p>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>
              <span className={styles.logoMark}>◆</span> Oracle Trade
            </span>
            <p className={styles.footerTagline}>
              The market&apos;s best idea, every morning.
            </p>
          </div>
          <div className={styles.footerCols}>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Product</span>
              <Link to="/dashboard" className={styles.footerLink}>Dashboard</Link>
              <Link to="/signals" className={styles.footerLink}>Signals</Link>
              <Link to="/portfolio" className={styles.footerLink}>Portfolio</Link>
              <Link to="/leaderboard" className={styles.footerLink}>Leaderboard</Link>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Company</span>
              <Link to="/methodology" className={styles.footerLink}>Methodology</Link>
              <Link to="/about" className={styles.footerLink}>About</Link>
              <a href="#pricing" className={styles.footerLink}>Pricing</a>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerColTitle}>Legal</span>
              <a href="#" className={styles.footerLink}>Terms</a>
              <a href="#" className={styles.footerLink}>Privacy</a>
              <span className={styles.footerDisclaimer}>
                Not financial advice. Past performance does not guarantee future results.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
