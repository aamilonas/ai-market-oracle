# QA Log

## CRITICAL

### 1. Re-running `score.py` can double-count leaderboard stats
Files:
- [scripts/score.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/score.py#L49)
- [scripts/score.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/score.py#L91)
- [scripts/score.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/score.py#L168)
- [scripts/score.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/score.py#L249)

Evidence:
`score_date()` loads any existing score file and returns `existing_data` unchanged when there are no new predictions to score. `main()` still calls `update_leaderboard(score_data)`, and `update_leaderboard()` increments totals by iterating every resolved result in the file. That makes the leaderboard non-idempotent on reruns.

Impact:
Any manual rerun or partial recovery run can inflate `total_predictions`, `correct_directions`, `total_score`, and streaks.

### 2. The "fail after push" health-check design can prevent deployment of already-pushed data
Files:
- [.github/workflows/morning.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/morning.yml#L88)
- [.github/workflows/morning.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/morning.yml#L98)
- [.github/workflows/deploy.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/deploy.yml#L7)
- [.github/workflows/deploy.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/deploy.yml#L31)

Evidence:
The morning workflow commits and pushes before the final health-check step intentionally fails the run. `deploy.yml` only runs for `workflow_run` events whose conclusion is `success`. The file comment explicitly says automated pushes using `GITHUB_TOKEN` do not trigger `push` events.

Impact:
When a run partially succeeds, the repo can contain fresher data than the deployed site. The alerting mechanism can unintentionally block publishing.

### 3. The morning cron is wrong during daylight saving time
Files:
- [.github/workflows/morning.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/morning.yml#L5)

Evidence:
The schedule is `30 13 * * 1-5`. During EDT, `13:30 UTC` is `9:30 AM ET`, not `8:30 AM ET`.

Impact:
For part of the year, predictions are generated at market open instead of before market open, which changes the experiment conditions.

## MEDIUM

### 4. The frontend computes "today" in UTC, not US Eastern time
Files:
- [src/data/useData.js](/Users/amilonas/Desktop/code/ai-market-oracle/src/data/useData.js#L47)
- [src/pages/Home.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Home.jsx#L67)

Evidence:
`getTodayDate()` returns `new Date().toISOString().slice(0, 10)`, which is a UTC date.

Impact:
In the evening US time, the homepage can start requesting tomorrow's data and appear empty or stale several hours too early.

### 5. The Weekly page is still hardcoded to a single seed week
Files:
- [src/pages/Weekly.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Weekly.jsx#L6)

Evidence:
`const WEEKS = ['2025-W07']` is hardcoded, while the repo has multiple real weekly summary files under `data/summaries/weekly/`.

Impact:
The Weekly page does not expose the real archive and will default to a nonexistent or obsolete week in production.

### 6. The Model page still uses a fixed seed date and old week formatting
Files:
- [src/pages/ModelPage.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/ModelPage.jsx#L10)
- [src/pages/ModelPage.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/ModelPage.jsx#L32)
- [src/pages/ModelPage.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/ModelPage.jsx#L62)
- [src/pages/ModelPage.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/ModelPage.jsx#L133)

Evidence:
The page always loads predictions and scores for `2025-02-19`, and chart labels strip `2025-` from week strings.

Impact:
Model detail pages do not show current data and still contain seed-era assumptions even though the rest of the app is live-data driven.

### 7. The Scoreboard still contains hardcoded demo head-to-head data and old week formatting
Files:
- [src/pages/Scoreboard.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Scoreboard.jsx#L20)
- [src/pages/Scoreboard.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Scoreboard.jsx#L64)
- [src/components/ScoreChart.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/components/ScoreChart.jsx#L42)

Evidence:
`headToHead` is a static demo array for `2025-02-19`, and both the scoreboard and chart strip `2025-` from week labels.

Impact:
The page presents seed/demo content as if it were live analytics and formats 2026 week data inconsistently.

### 8. Leaderboard fields shown in the UI are never actually maintained
Files:
- [scripts/score.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/score.py#L184)
- [data/leaderboard.json](/Users/amilonas/Desktop/code/ai-market-oracle/data/leaderboard.json)
- [src/components/LeaderboardTable.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/components/LeaderboardTable.jsx#L112)
- [src/pages/ModelPage.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/ModelPage.jsx#L96)

Evidence:
`update_leaderboard()` updates total predictions, accuracy, score, and streaks, but it never updates `avg_confidence` or `weekly_scores`. The current `data/leaderboard.json` shows `avg_confidence: 0.0` and empty `weekly_scores` arrays.

Impact:
Several UI sections are rendering misleading zeros or empty charts/tables instead of real metrics.

### 9. The OpenAI adapter claims web search but does not enable any search tool
Files:
- [scripts/adapters/openai_adapter.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/adapters/openai_adapter.py#L1)
- [scripts/adapters/openai_adapter.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/adapters/openai_adapter.py#L73)

Evidence:
The adapter docstring and prompt say GPT-4o has web search access, but the API call is a plain `chat.completions.create()` with no tool configuration.

Impact:
GPT-4o may not actually be operating under the same "internet-enabled" conditions described in the docs and methodology.

### 10. Daily summaries are generated before scoring and then never refreshed
Files:
- [.github/workflows/morning.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/morning.yml#L65)
- [scripts/summarize.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/summarize.py#L47)
- [.github/workflows/evening.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/evening.yml#L43)

Evidence:
The daily summary is generated only in the morning workflow. `build_daily_summary()` returns the existing file immediately if one already exists, and the evening workflow does not regenerate it after scores arrive.

Impact:
The homepage can keep showing pre-close summaries, pending notable calls, and stale consensus outcomes even after the day has been scored.

### 11. Validation warnings do not block bad prediction payloads from being persisted
Files:
- [scripts/utils.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/utils.py#L83)
- [scripts/generate.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/generate.py#L109)
- [data/predictions/2026-04-06/perplexity.json](/Users/amilonas/Desktop/code/ai-market-oracle/data/predictions/2026-04-06/perplexity.json)

Evidence:
`validate_prediction_payload()` flags invalid timeframes, but `generate.py` still saves payloads as long as there are predictions. There is already a persisted prediction with `"timeframe": "market_open"`, which the scoring script will skip.

Impact:
Invalid predictions can enter the dataset and become permanently unscorable.

### 12. `fred_data.py` uses `requests` without declaring it directly in `requirements.txt`
Files:
- [scripts/fred_data.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/fred_data.py#L6)
- [requirements.txt](/Users/amilonas/Desktop/code/ai-market-oracle/requirements.txt)

Evidence:
`fred_data.py` imports `requests`, but `requirements.txt` does not list it.

Impact:
The workflow currently depends on a transitive dependency relationship that could break unexpectedly.

### 13. Analytics failures are still silent in the evening workflow
Files:
- [.github/workflows/evening.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/evening.yml#L53)
- [.github/workflows/evening.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/evening.yml#L79)

Evidence:
The analytics step uses `continue-on-error: true`, and the final health check only inspects the scoring step outcome.

Impact:
The site can ship without fresh analytics data and without sending any alert.

## MINOR

### 14. Winner-threshold copy is inconsistent with the live rule
Files:
- [scripts/winner.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/winner.py#L4)
- [scripts/winner.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/winner.py#L26)
- [src/pages/Simulator.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Simulator.jsx#L178)

Evidence:
The code uses `MIN_MODELS_AGREEING = 3`, but docstrings and simulator copy still say `4+` models.

Impact:
This is easy to misread when auditing the simulator and consensus-pick behavior.

### 15. The About page contains stale model versions and a placeholder GitHub link
Files:
- [src/pages/About.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/About.jsx#L46)
- [src/pages/About.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/About.jsx#L90)

Evidence:
The page lists Gemini as `gemini-2.0-flash` and Grok as `grok-2`, while the adapters use newer model IDs. The repository link is just `https://github.com`.

Impact:
The public-facing project description is no longer aligned with the actual implementation.

### 16. The UI still contains several seed-era assumptions from 2025
Files:
- [src/pages/Weekly.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Weekly.jsx#L6)
- [src/pages/ModelPage.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/ModelPage.jsx#L10)
- [src/pages/Scoreboard.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Scoreboard.jsx#L23)

Evidence:
Hardcoded `2025` dates and week-formatting logic are still embedded in multiple production pages.

Impact:
This does not always break the app outright, but it makes the UI feel partially scaffolded rather than fully wired to the live dataset.

---

## Fixes Applied — 2026-04-09

### Fix #1: Leaderboard double-counting (CRITICAL)
**File:** `scripts/score.py`
**Fix:** Rewrote `update_leaderboard()` to rebuild from ALL score files on disk instead of incrementing from the current day's results. The function now reads every `data/scores/*.json` file, sorts results chronologically, and computes all stats from scratch (totals, accuracy, streaks). Fully idempotent — safe to run any number of times.

### Fix #2: Health-check blocking deployment (CRITICAL)
**File:** `.github/workflows/deploy.yml`
**Fix:** Changed the `workflow_run` condition from `conclusion == 'success'` to `conclusion != 'cancelled'`. The deploy job always builds fresh from HEAD, so a health-check failure (which occurs after data is already pushed) no longer blocks deployment. Only cancelled runs are skipped.

### Fix #3: Morning cron DST issue (CRITICAL)
**File:** `.github/workflows/morning.yml`
**Fix:** Changed cron from `30 13 * * 1-5` (13:30 UTC) to `30 12 * * 1-5` (12:30 UTC). This gives 8:30 AM EDT / 7:30 AM EST — always before 9:30 AM market open regardless of DST.

### Fix #4: Frontend UTC "today" (MEDIUM)
**File:** `src/data/useData.js`
**Fix:** Changed `getTodayDate()` from `new Date().toISOString().slice(0, 10)` (UTC) to `new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })` which returns YYYY-MM-DD in US Eastern time.

### Fix #5: Weekly page hardcoded seed week (MEDIUM)
**Files:** `src/pages/Weekly.jsx`, `src/data/useData.js`, `scripts/summarize.py`, `data/weeks-index.json` (new)
**Fix:** Removed hardcoded `WEEKS = ['2025-W07']`. Created `data/weeks-index.json` listing available weekly summaries. Added `loadWeeksIndex()` to useData.js. Weekly page now fetches the index on mount and shows the most recent week first. Added `update_weeks_index()` to summarize.py that rebuilds the index from files on disk after generating a weekly summary.

### Fix #6: ModelPage fixed seed date (MEDIUM)
**File:** `src/pages/ModelPage.jsx`
**Fix:** Replaced hardcoded `SEED_DATE = '2025-02-19'` with `getTodayDate()`. Predictions and scores now load for the current date. Removed `week.replace('2025-', '')` from chart labels — weeks are displayed as-is.

### Fix #7: Scoreboard demo H2H and week formatting (MEDIUM)
**Files:** `src/pages/Scoreboard.jsx`, `src/components/ScoreChart.jsx`
**Fix:** Removed hardcoded demo `headToHead` array. H2H section now loads `recent_clashes` from analytics.json (via `loadAnalytics()`). Section is hidden when analytics isn't available. Removed `week.replace('2025-', '')` from both Scoreboard weekly breakdown and ScoreChart.

### Fix #8: avg_confidence and weekly_scores never maintained (MEDIUM)
**File:** `scripts/score.py`
**Fix:** Extended the rebuilt `update_leaderboard()` (from fix #1) to compute `avg_confidence` (mean of all `confidence_at_prediction` values) and `weekly_scores` (per-ISO-week breakdown of score, predictions, and accuracy per model). Both fields are now populated on every leaderboard rebuild.

### Fix #9: OpenAI adapter missing web search (MEDIUM)
**File:** `scripts/adapters/openai_adapter.py`
**Fix:** Changed `MODEL_ID` from `gpt-4o` to `gpt-4o-search-preview` and added `web_search_options={}` to the `chat.completions.create()` call. This enables native web search per the OpenAI API.

### Fix #10: Daily summaries never refreshed post-scoring (MEDIUM)
**Files:** `scripts/summarize.py`, `.github/workflows/evening.yml`
**Fix:** Added `--force` flag to `build_daily_summary()` that skips the existing-file check. Added a "Regenerate daily summary (post-scoring)" step to the evening workflow that calls `summarize.py --daily --force` after scoring, so summaries include actual results.

### Fix #11: Invalid predictions not filtered before save (MEDIUM)
**File:** `scripts/generate.py`
**Fix:** After validation, generate.py now strips individual predictions with invalid `direction` or `timeframe` values before persisting. Imports `ALLOWED_DIRECTIONS` and `ALLOWED_TIMEFRAMES` from utils.py. Only saves predictions that pass these checks. Logs how many were stripped.

### Fix #12: requests missing from requirements.txt (MEDIUM)
**File:** `requirements.txt`
**Fix:** Added `requests>=2.31.0` as a direct dependency.

### Fix #13: Analytics failures silent in evening workflow (MEDIUM)
**File:** `.github/workflows/evening.yml`
**Fix:** Added `id: analytics` to the analytics step. Updated the health check to inspect both `steps.score.outcome` and `steps.analytics.outcome`, reporting which steps failed.

### Fix #14: Winner threshold copy mismatch (MINOR)
**Files:** `scripts/winner.py`, `src/pages/Simulator.jsx`
**Fix:** Updated docstring in winner.py from "4+" to "3+" and updated the empty-state message in Simulator.jsx from "4+ models" to "3+ models" to match the actual `MIN_MODELS_AGREEING = 3` constant.

### Fix #15: About page stale model versions and placeholder link (MINOR)
**File:** `src/pages/About.jsx`
**Fix:** Updated model IDs to match actual adapters: Gemini `gemini-2.0-flash` → `gemini-2.5-flash`, GPT-4o `gpt-4o` → `gpt-4o-search-preview`, Grok `grok-2` → `grok-3`. Changed GitHub link from `https://github.com` to actual repo URL.

### Fix #16: Seed-era 2025 assumptions in UI (MINOR)
**Resolution:** All seed-era 2025 references were already eliminated through fixes #5 (Weekly), #6 (ModelPage), and #7 (Scoreboard/ScoreChart). Confirmed no remaining `2025-W` or `2025-02-19` references in `src/`.

---

## Verification Pass — 2026-04-09

### Local checks run

- `npm run build` — passed
- `npm run lint` — failed because the repo has a lint script in `package.json` but no ESLint config file
- `env PYTHONPYCACHEPREFIX=/tmp/pycache python3 -m compileall scripts` — passed
- `python3 --version` — `3.9.6` locally, so Python runtime verification is still weaker than the GitHub Actions `3.12` target

### Fixed

- `#1` Leaderboard double-counting: code fix present and correct.
- `#2` Health-check blocking deployment: deploy trigger logic updated and correct.
- `#3` Morning cron DST issue: cron moved to `12:30 UTC`, which keeps the job before market open year-round.
- `#4` Frontend UTC "today": `getTodayDate()` now uses `America/New_York`.
- `#5` Weekly page hardcoded seed week: page now loads from `weeks-index.json`.
- `#6` ModelPage fixed seed date: current date is now used and old week formatting was removed.
- `#7` Scoreboard demo H2H and week formatting: demo data removed and analytics-backed loading added.
- `#9` OpenAI adapter missing web search: search-preview model plus `web_search_options={}` now present.
- `#10` Daily summaries never refreshed post-scoring: evening regeneration step plus `--force` support added.
- `#11` Invalid predictions not filtered before save: bad `direction` and `timeframe` values are now stripped before persistence.
- `#12` `requests` missing from requirements: direct dependency added.
- `#13` Analytics failures silent in evening workflow: analytics outcome is now checked in health check.
- `#15` About page stale model versions and placeholder link: page content now matches current adapters and repo URL.
- `#16` Seed-era 2025 assumptions in UI: no remaining `2025-W` or `2025-02-19` references in `src/`.

### All Resolved

- `#8` Leaderboard fields now maintained: code fix computes `avg_confidence` and `weekly_scores` from score data. Data artifact regenerated — leaderboard.json now contains real values (e.g. Claude avg_confidence: 0.7374, 7 weekly entries).
- `#14` Winner-threshold copy mismatch: function docstring in `winner.py:42` updated from `4+` to `3+`, matching `MIN_MODELS_AGREEING = 3`.

---

## Second Resolution Pass — 2026-04-09

### Fix #14 (partial): winner.py function docstring
**File:** `scripts/winner.py`
**Fix:** Updated `select_todays_winner()` docstring from `4+ models agree` to `3+ models agree`.

### Fix #17: Frontend missing model colors
**Files:** `src/data/useData.js`, `src/components/LeaderboardTable.jsx`, `src/components/ScoreChart.jsx`, `src/pages/ModelPage.jsx`, `src/pages/Scoreboard.jsx`
**Fix:** Added `enrichModelsWithColors()` helper in `useData.js` that injects `color` from the existing `MODEL_COLORS` map into model objects. Applied in all 4 consuming components (LeaderboardTable, ScoreChart, ModelPage, Scoreboard). Colors now render correctly without requiring the backend to emit them.

### Fix #18: ESLint config missing
**File:** `.eslintrc.cjs` (new)
**Fix:** Created standard ESLint 8 config for Vite + React using the plugins already in `devDependencies` (`eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`). Also fixed all 15 pre-existing lint errors and 2 warnings across 7 files:
- Escaped unquoted apostrophes in JSX text (`react/no-unescaped-entities`) in TodaysWinner, About, Home, Methodology, ModelPage, Weekly
- Added comments to empty catch blocks (`no-empty`) in Home
- Removed unused `SORT_KEYS` variable in LeaderboardTable (`no-unused-vars`)
- Removed unused `scores` destructuring in WeeklySummary (`no-unused-vars`)
- Added missing `today` dependency to useEffect in Home and ModelPage (`react-hooks/exhaustive-deps`)
- `npm run lint` now passes cleanly with 0 errors, 0 warnings

### Fix #19: Stale data artifacts
**Files:** `data/leaderboard.json`, `public/data/leaderboard.json`, `data/analytics.json` (new), `public/data/analytics.json` (new)
**Fix:** Rebuilt leaderboard from all 25 score files (379 results). Generated analytics.json with all 5 sections (ticker breakdown, calibration, herding, time series, head-to-head). Both artifacts now contain real data and are synced to `public/data/`.

### Verification

- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — 864 modules, 0 errors
- All Python files pass `ast.parse()` syntax check
- `data/leaderboard.json` — `avg_confidence` populated (was 0.0), `weekly_scores` populated (was [])
- `data/analytics.json` — exists with 379 predictions, 9 tickers, 58 unanimous calls, 15 H2H clashes

---

## Third Resolution Pass — 2026-04-09

A fresh audit after the second pass found 1 critical and 5 medium issues.

### Fix #20 (CRITICAL): analytics.json schema mismatch
**Files:** `data/analytics.json`, `public/data/analytics.json`
**Problem:** The analytics.json generated in the second pass used an ad-hoc schema that didn't match what `scripts/analytics.py` produces or what `Analytics.jsx` expects. Key differences: missing `data_range` wrapper, flat ticker dict instead of `by_ticker`/`by_group` arrays, flat calibration dict instead of `models` array with `calibration_error` + `buckets`, flat herding instead of `summary`/`daily_herding` structure.
**Impact:** `Analytics.jsx` line 22 destructures `data_range`, line 112 accesses `data_range.total_predictions`. With the wrong schema this crashes the page with `TypeError: Cannot read properties of undefined`.
**Fix:** Regenerated analytics.json by replicating the exact logic from `scripts/analytics.py` (adapted for local Python 3.9). All 16 schema paths verified correct.

### Fix #21 (MEDIUM): Layout footer GitHub link wrong
**File:** `src/components/Layout.jsx`
**Fix:** Changed `href="https://github.com"` to `href="https://github.com/aamilonas/ai-market-oracle"` (matching About.jsx).

### Fix #22 (MEDIUM): weekly.yml sync missing weeks-index.json
**File:** `.github/workflows/weekly.yml`
**Fix:** Added `cp data/weeks-index.json public/data/weeks-index.json 2>/dev/null || true` to the sync step.

### Fix #23 (MINOR): Duplicate import in Simulator.jsx
**File:** `src/pages/Simulator.jsx`
**Fix:** Combined two separate `import ... from '../data/useData'` lines into one.

### Not fixed (accepted)

- **Gemini missing from leaderboard** — Operational issue, not a code bug. Gemini adapter is fixed but hasn't generated scored predictions yet. Will self-heal when the pipeline runs.
- **exchange-calendars unused in requirements.txt** — Low risk; removing could break if any transitive dependency relies on it. Leaving for now.
- **About.jsx hardcoded model IDs** — Cosmetic; these only change when adapters are upgraded, which is infrequent.
- **Methodology.jsx simplified prompt** — Intentional design choice for readability.

### Verification

- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — 864 modules, 0 errors
- `data/analytics.json` — all 16 schema paths verified against Analytics.jsx expectations
- All Python files pass `ast.parse()` syntax check
