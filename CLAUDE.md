# AI Market Oracle

Automated platform comparing market prediction abilities of 5 AI models (Claude, Perplexity, Gemini, GPT-4o, Grok). Runs entirely on GitHub Actions — predictions at 8:30 AM ET, scoring at 5:30 PM ET, late-night sports rescore at 11:59 PM ET, weekly diary Saturdays.

## Tech Stack

- **Frontend:** React 18 + Vite + React Router + Recharts + CSS Modules
- **Backend/Automation:** Python 3.12 + GitHub Actions
- **Data:** JSON files committed to repo, mirrored to `public/data/`
- **Deployment:** GitHub Pages (base URL: `/ai-market-oracle/`)
- **External APIs:** yfinance (stocks + crypto prices), The Odds API (sports results)

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build to /dist
npm run lint         # ESLint (0 warnings allowed)
npm run preview      # Preview production build

# Python scripts (run from repo root)
pip install -r requirements.txt
python scripts/generate.py --date YYYY-MM-DD
python scripts/score.py --date YYYY-MM-DD
python scripts/score.py --rescore-sports --date YYYY-MM-DD
python scripts/summarize.py --daily --date YYYY-MM-DD
python scripts/summarize.py --weekly --week YYYY-WXX
```

## Prediction Categories

Each model makes 5-7 predictions daily across 3 categories:
- **Stocks (3-5):** Price direction + target, at least one major index (SPY/QQQ/DIA). `"category": "stock"`
- **Crypto (exactly 1):** Same price format, ticker must end in `-USD` (e.g. BTC-USD). `"category": "crypto"`
- **Sports (exactly 1):** Game winner prediction with sport, matchup, home/away teams. `"category": "sports"`

## Project Structure

- `scripts/` — Python automation (generate, score, summarize)
- `scripts/adapters/` — Per-model API adapters (adapter pattern)
- `scripts/sports_data.py` — The Odds API integration for sports results
- `src/components/` — Reusable React components (each with `.module.css`)
- `src/pages/` — Route pages (Home, ModelPage, Scoreboard, Weekly/Diary, Methodology, About)
- `src/data/useData.js` — Data loading utilities and constants
- `data/` — Source of truth (predictions, scores, summaries, leaderboard, weeks-index)
- `public/data/` — Mirrored data served to frontend
- `.github/workflows/` — Four cron workflows (morning, evening, late-night, weekly)

## Code Conventions

- React: Hooks-based functional components, CSS Modules for scoped styling
- Python: Adapter pattern for AI models, `get_logger()` for logging, `utils.py` for shared paths/validation
- Dark theme (#0a0a0a bg), model-specific accent colors (Claude: #E07A3A, Perplexity: #20B2AA, Gemini: #4285F4, GPT-4o: #10A37F, Grok: #C0C0C0)
- Category accent colors (Stocks: #4a9eff, Crypto: #f7931a, Sports: #22c55e)
- All data validated against strict JSON schemas
- ES Modules (`"type": "module"` in package.json)
- Prediction IDs: `pred_{modelname}_{yyyymmdd}_{counter}`

## Scoring

- **Stocks & Crypto:** +confidence if direction correct, -confidence if wrong, +0.5 bonus if within 1% of target
- **Sports:** +confidence if winner correct, -confidence if wrong (no target bonus)
- Sports games not finished at 5:30 PM are marked `pending_sports` and rescored at 11:59 PM

## Key Design Decisions

- JSON files as data store (no database) — version-controlled, simple
- Adapter pattern makes adding new AI models straightforward
- Scripts are idempotent — safe to re-run without duplicating data
- One model failure doesn't break the pipeline for others
- `sync_to_public()` mirrors data/ to public/data/ for frontend access
- Weekly diary format with day-by-day chapters, dynamically loaded from `weeks-index.json`
- Per-category leaderboard breakdowns in `model.categories` sub-object

## Secrets Required

- `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `GOOGLE_GEMINI_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`
- `ODDS_API_KEY` — from https://the-odds-api.com/ (free tier, ~22 req/month needed)
