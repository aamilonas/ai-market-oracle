import { createContext, useState, useEffect } from 'react'

export const AuthContext = createContext(null)

const DEFAULT_STATE = {
  isLoggedIn: false,
  user: null,
  brokerageConnected: false,
  preferences: {
    accountSize: null,
    riskTolerance: null,
    sectors: [],
    frequency: 'daily',
  },
  brokerageSettings: {
    autoTrade: false,
    positionSize: 5,
    maxDailyTrades: 3,
  },
}

function loadState() {
  try {
    const saved = localStorage.getItem('oracle-trade-auth')
    return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : DEFAULT_STATE
  } catch {
    return DEFAULT_STATE
  }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    localStorage.setItem('oracle-trade-auth', JSON.stringify(state))
  }, [state])

  const login = (email) => {
    setState(prev => ({
      ...prev,
      isLoggedIn: true,
      user: { email, name: email.split('@')[0] },
    }))
  }

  const logout = () => {
    setState(DEFAULT_STATE)
    localStorage.removeItem('oracle-trade-auth')
  }

  const connectBrokerage = () => {
    setState(prev => ({ ...prev, brokerageConnected: true }))
  }

  const updatePreferences = (prefs) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...prefs },
    }))
  }

  const updateBrokerageSettings = (settings) => {
    setState(prev => ({
      ...prev,
      brokerageSettings: { ...prev.brokerageSettings, ...settings },
    }))
  }

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      connectBrokerage,
      updatePreferences,
      updateBrokerageSettings,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
