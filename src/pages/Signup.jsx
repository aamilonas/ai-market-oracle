import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import styles from './Signup.module.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email && password.length >= 6) {
      login(email)
      navigate('/onboarding')
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.backLogo}>
        <span className={styles.logoMark}>◆</span>
        <span>Oracle Trade</span>
      </Link>

      <div className={`${styles.card} animate-in`}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.sub}>Start receiving AI-powered trade signals today.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={styles.input}
              required
            />
          </label>

          <label className={styles.label}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className={styles.input}
              minLength={6}
              required
            />
          </label>

          <button type="submit" className={styles.btn}>Create Account</button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/dashboard" className={styles.link}>Sign in</Link>
        </p>
      </div>

      <p className={styles.disclaimer}>Your data is encrypted and never shared.</p>
    </div>
  )
}
