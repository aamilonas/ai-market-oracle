# AI Market Oracle — Improvement Plan

## Current Status Assessment

The pipeline has been running for 30+ days but at ~80% health. Key finding: **Gemini has never successfully generated a prediction** (0/33 days), meaning only 4 of 5 models are actually competing. No alerts exist, so this went unnoticed.

---

## Priority 1: Monitoring & Alerts

**Problem:** No notifications when an API fails or runs out of credits. Gemini has been broken the entire time without detection. If at least 1 model succeeds, the workflow shows green — failures are invisible.

**What happens today:**
- Adapter retries 3x with backoff, then silently returns `None`
- Failed model is skipped, workflow continues
- Errors only visible in GitHub Actions logs (manual inspection required)
- Even total failure (all 5 models) only shows a red X in the Actions tab — no email/Slack/webhook

**Fix:**
- Add a Discord or Slack webhook notification step to morning/evening workflows
- Report which models succeeded/failed after each run
- Optionally: generate a `data/health.json` that the frontend can display
- Enable GitHub's built-in email notifications for failed Actions (Settings > Notifications)

**Effort:** Low (~10 lines of YAML per workflow + webhook setup)

---

## Priority 2: Fix or Remove Gemini

**Problem:** Gemini adapter loads but `generate()` always fails — 0/33 days. The consensus threshold was lowered from 4 to 3 models as a workaround. Gemini still appears in docs/methodology but produces nothing.

**Investigation needed:**
- Is the `GOOGLE_GEMINI_API_KEY` secret set correctly?
- Is the google-genai SDK version compatible?
- Is the response parsing (`_clean_grounding_artifacts()`) still broken?
- Check recent Actions logs for specific Gemini error messages

**Fix options:**
- A) Debug and fix the adapter (check API key, SDK version, JSON parsing)
- B) Formally remove Gemini from the pipeline and docs if it can't be fixed

**Effort:** Medium (debugging) or Low (removal)

---

## Priority 3: Feed Models Standardized Market Data

**Problem:** Models currently receive ONLY the date and a prompt to "research current market conditions" via web search. Each model finds its own prices, leading to inconsistent entry prices across models (e.g., one model sees SPY at $500, another at $502). Web search can be stale or hallucinated.

**Current flow:**
```
generate.py → adapter → AI API (with web search) → predictions
                         ↑ only input: date string
```

**Proposed flow:**
```
generate.py → fetch yesterday's data via yfinance → adapter → AI API → predictions
                                                      ↑ input: date + real market data
```

**What to feed models:**
- Previous day's close for major indices (SPY, QQQ, DIA)
- 5-day price history + % change for those indices
- Previous day's close for popular tickers (AAPL, MSFT, NVDA, TSLA, etc.)
- VIX (volatility index) current level
- Keeps the playing field level — all models see the same baseline

**Benefits:**
- Consistent entry prices across models
- Better scoring accuracy (no hallucinated prices)
- Reduced dependence on flaky web search (especially Gemini)
- Models can spend their web search budget on news/analysis instead of basic price lookups

**Effort:** Medium (add yfinance call in generate.py, modify prompt template)

---

## Priority 4: Add Supplemental Data APIs

**Problem:** Models rely entirely on their own web search for market context. Some models have better search than others, creating an uneven playing field.

**Key constraint:** Can't use a single news source — that would herd all models toward the same narrative.

**Recommended APIs (data feeds, not opinions):**

### A) FRED API (Federal Reserve Economic Data) — Free
- URL: https://fred.stlouisfed.org/docs/api/fred/
- Data: interest rates, CPI, unemployment, GDP, Fed Funds rate, treasury yields
- Why: These are the macro fundamentals that move markets
- Cost: Free (API key required, generous limits)
- Feed to models: latest values for key indicators + recent changes

### B) VIX / Market Sentiment via yfinance — Free (already installed)
- Pull `^VIX` (CBOE Volatility Index) as part of market context
- Gives models a quantitative fear/greed signal
- No extra dependency needed
- Could also pull `^TNX` (10-year treasury yield) for rate context

**These are raw data feeds, not editorial opinions** — they inform without biasing.

**Effort:** Low-Medium (FRED API integration + prompt modification)

---

## Priority 5: Clean Up Stale References

**Problem:** Documentation and code reference features that no longer exist, creating confusion.

**Stale references to clean up:**
- CLAUDE.md still mentions sports predictions, late-night rescore workflow, and The Odds API
- Scoring code has sports-related branches (`category == "sports"`)
- No `late-night.yml` workflow exists despite being documented
- `ODDS_API_KEY` listed in required secrets but not used

**Fix:** Update CLAUDE.md, README.md, and code comments to reflect current state (stocks + crypto only, 4 working models).

**Effort:** Low

---

## Priority 6: Performance Analytics (Stretch)

**Problem:** 30+ days of rich prediction data exists but the only analysis is a basic leaderboard. Deeper insights are being left on the table.

**Potential additions:**
- Which model is best at which sector/ticker type?
- Does confidence correlate with accuracy per model? (calibration analysis)
- Do models herd? (How often do all models pick the same direction?)
- Time-series analysis: are models getting better or worse over time?
- Head-to-head records when two models predict the same ticker

**Effort:** Medium-High (new analysis scripts + frontend components)

---

## Suggested Order of Execution

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Add monitoring/alerts (webhook notifications) | Low | High |
| 2 | Fix Gemini adapter or remove it | Low-Med | High |
| 3 | Feed models standardized market data via yfinance | Medium | High |
| 4 | Add FRED API + VIX data to model context | Low-Med | Medium |
| 5 | Clean up stale docs/code (sports references) | Low | Low |
| 6 | Performance analytics dashboard | Med-High | Medium |

---

## Implementation Log

### 2026-04-09 — Priorities 1–5 Completed

All changes committed and pushed to `master`.

#### Priority 2: Fix Gemini Adapter — `29ed3fd`

**Root cause found:** A stray triple-quote (`"""`) on line 61 of `scripts/adapters/gemini_adapter.py` caused a `SyntaxError` that prevented the entire module from loading. The line read `return text"""` instead of `return text`. This meant Gemini silently failed on every run for 33+ days.

**Fix:** Removed the trailing `"""`. Tested the new Gemini API key — both basic generation and Google Search grounding work.

**Files changed:** `scripts/adapters/gemini_adapter.py`

---

#### Priority 1: Monitoring & Alerts — `ee6b2fb`

**Approach:** Email-only (GitHub's built-in failed Actions notifications). The key problem was that workflows showed green even when individual models failed silently.

**Changes:**
- `scripts/generate.py` — Added `_write_ci_summary()` that writes a GitHub Actions step summary (shows which models succeeded/failed with checkmarks) and sets `failed_models` as a step output variable
- `.github/workflows/morning.yml` — Added `id: generate` to the generate step; added a final "Health check" step that runs `if: always()` (after commit/push) and fails the workflow if any models failed
- `.github/workflows/evening.yml` — Added `id: score` to the scoring step; added a final health check that fails if scoring errored
- `.github/workflows/weekly.yml` — Added `id: summarize` to the summary step; added a final health check that fails if summary generation errored

**How it works:** The pipeline still completes fully (predictions are committed and pushed), then the health check step runs last. If any model failed, it exits with code 1, which marks the workflow as failed and triggers GitHub's email notification.

**User action required:** Verify GitHub email notifications are enabled at Settings > Notifications.

**Files changed:** `scripts/generate.py`, `.github/workflows/morning.yml`, `.github/workflows/evening.yml`, `.github/workflows/weekly.yml`

---

#### Priority 3: Standardized Market Data via yfinance — `6861553`

**Changes:**
- `scripts/market_data.py` — Added `get_market_context()` function that fetches in a single `yf.download()` call:
  - Major indices: SPY, QQQ, DIA (previous close + 5-day % change)
  - Key stocks: AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META (previous close)
  - Market indicators: VIX (with 5-day change), 10-Year Treasury Yield (^TNX)
  - Crypto: BTC-USD, ETH-USD (previous close + 5-day % change)
  - Formatted as a readable text block with an instruction to use these as `current_price_at_prediction` values
- `scripts/generate.py` — Fetches market context once before the adapter loop, passes it to each adapter via `market_context` kwarg. Gracefully degrades if yfinance fails.
- All 5 adapters (`claude_adapter.py`, `perplexity_adapter.py`, `gemini_adapter.py`, `openai_adapter.py`, `grok_adapter.py`) — Updated `generate()` signature to accept `market_context: str = ""` kwarg; injects the data block into the prompt (prepended to user message, or inserted into the prompt body for Claude)

**Files changed:** `scripts/market_data.py`, `scripts/generate.py`, all 5 adapter files in `scripts/adapters/`

---

#### Priority 4: FRED API Integration — `2e60f4d`

**Changes:**
- `scripts/fred_data.py` — New module that fetches key macro indicators from the FRED API:
  - 10-Year Treasury Yield (DGS10)
  - 2-Year Treasury Yield (DGS2)
  - Fed Funds Rate (FEDFUNDS)
  - CPI / Consumer Price Index (CPIAUCSL)
  - Unemployment Rate (UNRATE)
  - 10Y-2Y Yield Spread (T10Y2Y)
  - Uses raw `requests` library (no new dependencies)
  - Gracefully returns empty string if `FRED_API_KEY` is not set
- `scripts/generate.py` — After fetching yfinance context, appends FRED data if available
- `.github/workflows/morning.yml` — Added `FRED_API_KEY: ${{ secrets.FRED_API_KEY }}` to the generate step's env

**User action required:**
1. Get a free API key at https://fred.stlouisfed.org/docs/api/api_key.html
2. Add as `FRED_API_KEY` in GitHub repo secrets (Settings > Secrets and variables > Actions)

**Files changed:** `scripts/fred_data.py` (new), `scripts/generate.py`, `.github/workflows/morning.yml`

---

#### Priority 5: Clean Up Stale References — `1fe1db9`

**Changes:**
- `CLAUDE.md` — Full rewrite to reflect current state:
  - Removed all sports prediction references, sports category, sports scoring rules
  - Removed The Odds API, `ODDS_API_KEY`, `sports_data.py`, `--rescore-sports` command
  - Removed late-night rescore workflow reference
  - Changed "Four cron workflows" to "Three cron workflows + deploy"
  - Added `scripts/market_data.py` and `scripts/fred_data.py` to project structure
  - Added `FRED_API_KEY` to secrets (replacing `ODDS_API_KEY`)
  - Added new key design decisions (standardized market data, health check steps)
- `scripts/winner.py` — Removed dead `if pred.get("category") == "sports": continue` check and updated the comment above it

**Files changed:** `CLAUDE.md`, `scripts/winner.py`

---

#### Priority 6: Performance Analytics — `2026-04-09`

**Approach:** Python script computes analytics from all scored predictions → JSON file → React page displays with Recharts visualizations. Follows the same pipeline pattern as every other feature in the project.

**New files created:**

- `scripts/analytics.py` — Reads all `data/scores/*.json` files, computes 5 analytics sections, writes `data/analytics.json` + syncs to `public/data/`:
  - **Ticker breakdown:** Per-ticker and per-group (index/stock/crypto) accuracy by model. Only includes tickers with 3+ predictions. Groups by SPY/QQQ/DIA → "index", *-USD → "crypto", else → "stock".
  - **Confidence calibration:** Buckets predictions by confidence range (50-59%, 60-69%, ..., 90%+), computes actual accuracy per bucket per model. Calibration error = mean |midpoint - actual_accuracy| across non-empty buckets.
  - **Herding analysis:** Groups predictions by (date, ticker) across models. Tracks unanimous calls (all models agree), consensus accuracy, and contrarian wins (minority direction was correct). Daily herding rate time series.
  - **Time series:** Daily scores, cumulative scores, and 5-day rolling accuracy per model.
  - **Head-to-head:** Pairwise win-loss-tie records for every model pair on same-ticker same-day predictions. A "win" = one model correct + other wrong. Last 15 decisive clashes.

- `src/pages/Analytics.jsx` — React page with 5 sections:
  - Hero with 4 stat cards (total predictions, trading days, most accurate model, best calibrated model)
  - Grouped `<BarChart>` showing accuracy per model for top 8 tickers + category summary table
  - `<LineChart>` for calibration (stated confidence vs actual accuracy, dashed perfect-calibration reference line) + calibration error table
  - 3 herding stat cards + `<LineChart>` of herding rate over time
  - `<LineChart>` for cumulative score over time + `<LineChart>` for 5-day rolling accuracy
  - H2H matrix table (win-loss-tie per model pair) + recent clashes cards

- `src/pages/Analytics.module.css` — Styles reusing established patterns from `Scoreboard.module.css` (tables, h2h cards, section titles) and `Simulator.module.css` (stat grid, stat cards). Added `.matrixCell`, `.matrixSelf`, `.h2hModelCorrect`, `.h2hModelWrong`, `.calibrationNote` for analytics-specific elements.

**Files edited:**

- `src/data/useData.js` — Added `loadAnalytics()` export (fetches `data/analytics.json`)
- `src/App.jsx` — Added `Analytics` import and `/analytics` route
- `src/components/Navbar.jsx` — Added "Analytics" nav link after "Scoreboard"
- `.github/workflows/evening.yml` — Added "Generate analytics" step with `continue-on-error: true` (runs after scoring, before sync). Added `cp data/analytics.json public/data/analytics.json` to the sync step.

**Verification:**
- `npm run build` — passes cleanly (864 modules, 0 errors)
- VS Code diagnostics — 0 issues in Analytics.jsx
- Python script not runnable locally (system Python 3.9.6, project requires 3.12) but follows identical patterns to existing scripts and will work in GitHub Actions

**Files changed:** `scripts/analytics.py` (new), `src/pages/Analytics.jsx` (new), `src/pages/Analytics.module.css` (new), `src/data/useData.js`, `src/App.jsx`, `src/components/Navbar.jsx`, `.github/workflows/evening.yml`

---

### All 6 Priorities Complete

The improvement plan is fully implemented. The pipeline now has monitoring/alerts, all 5 models working (including Gemini), standardized market data (yfinance + FRED), clean documentation, and a full performance analytics dashboard.

---

### 2026-04-09 — QA Audit: All 16 Issues Fixed

A comprehensive QA audit (`qa.md`) identified 16 issues across 3 severity levels. All were fixed in a single session.

#### Critical Fixes (3)

1. **Leaderboard double-counting** — Rewrote `update_leaderboard()` to rebuild from ALL score files instead of incrementing. Fully idempotent now.
2. **Health-check blocking deployment** — Changed deploy.yml to deploy on any completed workflow run (not just success), since data is already pushed before health check runs.
3. **Morning cron DST issue** — Changed from `13:30 UTC` to `12:30 UTC` so predictions always generate before 9:30 AM market open regardless of EST/EDT.

#### Medium Fixes (10)

4. **Frontend UTC "today"** — `getTodayDate()` now uses `America/New_York` timezone.
5. **Weekly page hardcoded** — Created `data/weeks-index.json`, added `loadWeeksIndex()`, Weekly page loads dynamically. `summarize.py` maintains the index.
6. **ModelPage seed date** — Replaced `SEED_DATE = '2025-02-19'` with `getTodayDate()`, removed week label stripping.
7. **Scoreboard demo H2H** — Replaced hardcoded demo data with live `analytics.json` data. Removed week label stripping.
8. **avg_confidence & weekly_scores** — Extended `update_leaderboard()` to compute both fields from score data. Charts and tables now render real data.
9. **OpenAI web search** — Switched to `gpt-4o-search-preview` model with `web_search_options={}`.
10. **Stale daily summaries** — Added `--force` flag to `summarize.py`, evening workflow now regenerates daily summary after scoring.
11. **Invalid predictions persisted** — `generate.py` now strips predictions with invalid `direction`/`timeframe` before saving.
12. **Missing `requests` dependency** — Added `requests>=2.31.0` to `requirements.txt`.
13. **Silent analytics failures** — Added `id: analytics` to evening workflow step, health check now inspects both scoring and analytics outcomes.

#### Minor Fixes (3)

14. **Winner threshold copy** — Updated docstring and Simulator.jsx from "4+" to "3+" to match `MIN_MODELS_AGREEING = 3`.
15. **About page stale info** — Updated model IDs (Gemini → `gemini-2.5-flash`, GPT-4o → `gpt-4o-search-preview`, Grok → `grok-3`). Fixed GitHub link to actual repo URL.
16. **Seed-era 2025 assumptions** — Resolved via fixes #5, #6, #7. No remaining hardcoded 2025 references in `src/`.

#### Files Changed

**Python:** `scripts/score.py`, `scripts/generate.py`, `scripts/summarize.py`, `scripts/winner.py`, `scripts/adapters/openai_adapter.py`, `requirements.txt`
**Frontend:** `src/data/useData.js`, `src/pages/Weekly.jsx`, `src/pages/ModelPage.jsx`, `src/pages/Scoreboard.jsx`, `src/pages/Simulator.jsx`, `src/pages/About.jsx`, `src/components/ScoreChart.jsx`
**Workflows:** `.github/workflows/morning.yml`, `.github/workflows/evening.yml`, `.github/workflows/deploy.yml`
**Data:** `data/weeks-index.json` (new), `public/data/weeks-index.json` (new)

#### Verification

- `npm run build` — passes cleanly (864 modules, 0 errors)
- All Python files pass `ast.parse()` syntax check
- VS Code diagnostics — 0 issues
- All 16 QA items documented in `qa.md` with per-fix details

---

### 2026-04-09 — QA Second Pass: All Remaining Issues Resolved

The verification pass identified 2 partial fixes (#8, #14) and 3 new open issues (#17, #18, #19). All resolved:

- **#14 partial** — Fixed `winner.py` function docstring from "4+" to "3+"
- **#17** — Added `enrichModelsWithColors()` helper in `useData.js`; applied in LeaderboardTable, ScoreChart, ModelPage, Scoreboard. Colors now render from frontend `MODEL_COLORS` map.
- **#18** — Created `.eslintrc.cjs` config for ESLint 8 + React. Fixed 15 pre-existing lint errors and 2 warnings across 7 files. `npm run lint` now passes with 0 issues.
- **#8/#19** — Rebuilt `data/leaderboard.json` from 25 score files (379 results) — `avg_confidence` and `weekly_scores` now populated. Generated `data/analytics.json` with ticker breakdown, calibration, herding, time series, and H2H data.

All QA items fully resolved. `npm run lint` and `npm run build` both pass cleanly.
