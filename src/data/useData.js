/**
 * Data loading utilities.
 * In production (GitHub Pages), JSON files are served from /public/data/.
 * In dev, Vite serves them from /data/ via the publicDir.
 */

const BASE = import.meta.env.BASE_URL

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json()
}

export async function loadLeaderboard() {
  return fetchJSON('data/leaderboard.json')
}

export async function loadPredictions(date, modelName) {
  return fetchJSON(`data/predictions/${date}/${modelName}.json`)
}

export async function loadScores(date) {
  return fetchJSON(`data/scores/${date}.json`)
}

export async function loadDailySummary(date) {
  return fetchJSON(`data/summaries/daily/${date}.json`)
}

export async function loadWeeklySummary(week) {
  return fetchJSON(`data/summaries/weekly/${week}.json`)
}

export async function loadSimulator() {
  return fetchJSON('data/simulator.json')
}

export async function loadTodaysWinner() {
  return fetchJSON('data/winner-today.json')
}

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

export const MODEL_NAMES = ['claude', 'perplexity', 'gemini', 'gpt4o', 'grok']

export const MODEL_DISPLAY_MAP = {
  claude: 'Claude',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  gpt4o: 'GPT-4o',
  grok: 'Grok',
}

export const MODEL_COLORS = {
  Claude: '#E07A3A',
  Perplexity: '#20B2AA',
  Gemini: '#4285F4',
  'GPT-4o': '#10A37F',
  Grok: '#C0C0C0',
}
