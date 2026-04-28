import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import ModelPage from './pages/ModelPage'
import Scoreboard from './pages/Scoreboard'
import Simulator from './pages/Simulator'
import Weekly from './pages/Weekly'
import Methodology from './pages/Methodology'
import Analytics from './pages/Analytics'
import About from './pages/About'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import ConnectBrokerage from './pages/ConnectBrokerage'
import Portfolio from './pages/Portfolio'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'
import Signals from './pages/Signals'

const BASE = import.meta.env.BASE_URL

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={BASE}>
          <Layout>
            <Routes>
              {/* Public — full width */}
              <Route path="/" element={<Landing />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Dashboard — sidebar layout */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/signals" element={<Signals />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/connect-brokerage" element={<ConnectBrokerage />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<Settings />} />

              {/* Analysis — sidebar layout, public */}
              <Route path="/predictions" element={<Home />} />
              <Route path="/leaderboard" element={<Scoreboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/paper-trading" element={<Simulator />} />
              <Route path="/weekly" element={<Weekly />} />
              <Route path="/model/:name" element={<ModelPage />} />

              {/* Info */}
              <Route path="/methodology" element={<Methodology />} />
              <Route path="/about" element={<About />} />

              {/* Legacy redirects */}
              <Route path="/scoreboard" element={<Scoreboard />} />
              <Route path="/simulator" element={<Simulator />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
