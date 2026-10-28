/**
 * Data loading utilities.
 * In production (GitHub Pages), JSON files are served from /public/data/.
 * In dev, Vite serves them from /data/ via the publicDir.
 */

import MODELS_REGISTRY from '../../models.json'

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

export async function loadAnalytics() {
  return fetchJSON('data/analytics.json')
}

export async function loadWeeksIndex() {
  return fetchJSON('data/weeks-index.json')
}

export function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export async function loadRun(date) {
  return fetchJSON(`data/runs/${date}.json`)
}

// Single source of truth for the model lineup, shared with the Python scripts.
export const MODELS = MODELS_REGISTRY
export const ACTIVE_MODELS = MODELS.filter(m => m.active !== false)
export const MODEL_NAMES = ACTIVE_MODELS.map(m => m.slug)

export const MODEL_BY_SLUG = Object.fromEntries(MODELS.map(m => [m.slug, m]))

export const MODEL_COLORS = Object.fromEntries(MODELS.map(m => [m.display_name, m.color]))

export const WEB_SEARCH_LABELS = {
  native: "Provider's native web search",
  built_in: 'Always-on search (built into the model)',
  exa: 'Exa web search via OpenRouter',
}

export function enrichModelsWithColors(models) {
  return models.map(m => ({
    ...m,
    color: m.color || MODEL_BY_SLUG[m.slug]?.color || MODEL_COLORS[m.model_display_name] || '#888',
  }))
}

// A leaderboard row with zero history, for models that haven't been scored yet.
export function emptyModelStats(model) {
  return {
    slug: model.slug,
    model_id: model.openrouter_model,
    model_display_name: model.display_name,
    active: model.active !== false,
    total_predictions: 0,
    correct_directions: 0,
    direction_accuracy: 0,
    total_score: 0,
    avg_score: 0,
    avg_confidence: 0,
    days_predicted: 0,
    current_streak: 0,
    best_streak: 0,
    worst_streak: 0,
    weekly_scores: [],
  }
}
