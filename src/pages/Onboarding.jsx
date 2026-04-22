import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import styles from './Onboarding.module.css'

const STEPS = [
  { key: 'accountSize', title: 'Account Size', sub: 'How much are you planning to invest?',
    options: ['$1,000', '$5,000', '$25,000', '$50,000+'] },
  { key: 'riskTolerance', title: 'Risk Tolerance', sub: 'How aggressive should your trades be?',
    options: ['Conservative', 'Moderate', 'Aggressive'] },
  { key: 'sectors', title: 'Preferred Sectors', sub: 'What markets interest you most?',
    options: ['Tech Stocks', 'Index ETFs', 'Crypto', 'All Markets'] },
  { key: 'frequency', title: 'Trading Frequency', sub: 'How often do you want trade signals?',
    options: ['Daily', 'Weekly'] },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const { updatePreferences } = useAuth()
  const navigate = useNavigate()
  const current = STEPS[step]

  const select = (value) => {
    const next = { ...answers, [current.key]: value }
    setAnswers(next)
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      updatePreferences(next)
      navigate('/dashboard')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.progress}>
        {STEPS.map((_, i) => (
          <div key={i} className={`${styles.dot} ${i <= step ? styles.dotActive : ''}`} />
        ))}
      </div>

      <div className="animate-in" key={step}>
        <h1 className={styles.title}>{current.title}</h1>
        <p className={styles.sub}>{current.sub}</p>
        <div className={styles.options}>
          {current.options.map(opt => (
            <button key={opt} onClick={() => select(opt)} className={styles.option}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.stepLabel}>Step {step + 1} of {STEPS.length}</p>
    </div>
  )
}
