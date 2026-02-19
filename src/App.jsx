import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ModelPage from './pages/ModelPage'
import Scoreboard from './pages/Scoreboard'
import Weekly from './pages/Weekly'
import Methodology from './pages/Methodology'
import About from './pages/About'

const BASE = import.meta.env.BASE_URL

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/model/:name" element={<ModelPage />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
          <Route path="/weekly" element={<Weekly />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
