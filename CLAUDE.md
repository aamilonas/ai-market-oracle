# AI Market Oracle

Automated platform comparing the market prediction abilities of 9 AI models, all called through OpenRouter. The lineup is defined in `models.json` (shared by scripts and frontend). Runs entirely on GitHub Actions — predictions on weekday mornings, scoring at 5:30 PM ET, weekly report Saturdays. Long-term goal: identify which models (or committees of models) to trust as trade signals.

## Tech Stack

- **Frontend:** React 18 + Vite + React Router + Recharts + CSS Modules
- **Backend/Automation:** Python 3.12 + GitHub Actions
- **Data:** JSON files committed to repo, mirrored to `public/data/`
- **Deployment:** GitHub Pages (base URL: `/ai-market-oracle/`)
- **External APIs:** OpenRouter (all AI models), yfinance (stocks + crypto prices), FRED API (macro indicators)

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build to /dist
npm run lint         # ESLint (0 warnings allowed)
npm run preview      # Preview production build

# Python scripts (run from repo root)
pip install -r requirements.txt
python scripts/generate.py --date YYYY-MM-DD [--dry-run] [--models slug1,slug2]
python scripts/score.py --date YYYY-MM-DD
python scripts/summarize.py --daily --date YYYY-MM-DD
python scripts/summarize.py --weekly --week YYYY-WXX
```

## Prediction Categories

Each model makes 3-5 same-day (`end_of_day`) predictions: direction + target price, at least one on SPY/QQQ/DIA.
Tickers are Yahoo Finance symbols; crypto ends in `-USD` (e.g. BTC-USD).
The scoring baseline is the live yfinance price recorded when the model answered (`current_price_at_prediction`);
the model's own claimed price is kept as `model_reported_price`.

## Project Structure

- `models.json` — Model registry: slug, display name, OpenRouter id, search mode, color, active flag
- `scripts/` — Python automation (generate, score, summarize, analytics, winner)
- `scripts/prompts/` — The single prediction prompt every model receives (also shown on the Methodology page)
- `scripts/openrouter.py`, `scripts/adapters/openrouter_adapter.py` — One adapter for all models
- `scripts/market_data.py` — yfinance integration for prices
- `scripts/fred_data.py` — FRED API integration for macro indicators
- `src/components/` — Reusable React components (each with `.module.css`)
- `src/pages/` — Route pages (Home, ModelPage, Scoreboard, Weekly/Diary, Methodology, About)
- `src/data/useData.js` — Data loading utilities and constants
- `data/` — Source of truth (predictions, scores, runs, summaries, leaderboard, analytics, weeks-index)
- `public/data/` — Mirrored data served to frontend
- `.github/workflows/` — Three cron workflows (morning, evening, weekly) + deploy

## Code Conventions

- React: Hooks-based functional components, CSS Modules for scoped styling
- Python: Adapter pattern for AI models, `get_logger()` for logging, `utils.py` for shared paths/validation
- Dark theme (#0a0a0a bg); model accent colors live in `models.json`
- All data validated against strict JSON schemas
- ES Modules (`"type": "module"` in package.json)
- Prediction IDs: `pred_{slug}_{yyyymmdd}_{counter}`, assigned by `generate.py` (never by the model)
- Leaderboard rows are keyed by `slug`; a model upgrade gets a new slug so records never mix versions

## Scoring

- **Stocks & Crypto:** +confidence if direction correct, -confidence if wrong, +0.5 bonus if direction correct and within 1% of target
- `analytics.py` also tracks directional return %, Brier score, and committee accuracy (groups of models that agree)

## Key Design Decisions

- JSON files as data store (no database) — version-controlled, simple
- Adding a model is one entry in `models.json`; all models share one OpenRouter adapter and one prompt
- Scripts are idempotent — safe to re-run without duplicating data
- One model failure doesn't break the pipeline for others
- `sync_to_public()` mirrors data/ to public/data/ for frontend access
- Weekly diary format with day-by-day chapters, dynamically loaded from `weeks-index.json`
- Models receive standardized market data (yfinance + FRED) in their prompts for consistent pricing
- Health check steps in workflows surface failures via GitHub email notifications

## Secrets Required

- `OPENROUTER_API_KEY` — the only model key needed
- `FRED_API_KEY` — from https://fred.stlouisfed.org/ (free tier, optional — skips gracefully if not set)
