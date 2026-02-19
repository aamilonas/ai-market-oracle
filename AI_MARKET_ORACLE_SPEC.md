# AI Market Oracle — Project Specification

## Vision

An automated, self-updating website that asks multiple AI models (each with internet access) to make specific, falsifiable stock market predictions every weekday morning before market open. Predictions are scored against real market data after close. Over time, a public leaderboard emerges showing which AI model is the best market forecaster. The entire system runs autonomously via GitHub Actions with zero human intervention after initial deployment.

This is equal parts technical showcase, AI art project, and quantitative experiment.

---

## Tech Stack

- **Frontend:** React (Vite) — static build deployed to GitHub Pages
- **Backend/Automation:** Python scripts executed via GitHub Actions on a cron schedule
- **Data Storage:** JSON files committed to the repo (no external database)
- **Deployment:** GitHub Pages (free, auto-deployed from the repo)
- **AI APIs:** Anthropic Claude (with web search tool), Perplexity, Google Gemini, OpenAI GPT-4o (with web search), xAI Grok
- **Market Data:** A free financial data API for scoring (Yahoo Finance via `yfinance`, or Alpha Vantage free tier, or similar)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   GitHub Repository                  │
│                                                      │
│  /src                 → React frontend (Vite)        │
│  /data                                               │
│    /predictions       → Daily prediction JSON files  │
│    /scores            → Daily scoring JSON files     │
│    /summaries         → Daily & weekly summaries     │
│    leaderboard.json   → Running scoreboard           │
│    history.json       → All-time prediction archive  │
│  /scripts                                            │
│    generate.py        → Calls AI APIs for predictions│
│    score.py           → Scores previous predictions  │
│    summarize.py       → Generates daily/weekly recap │
│  /.github/workflows                                  │
│    morning.yml        → Pre-market prediction run    │
│    evening.yml        → Post-market scoring run      │
│    weekly.yml         → Weekly summary generation    │
└─────────────────────────────────────────────────────┘
```

---

## Data Schema

### Prediction Format

Every AI model must output predictions in this exact JSON structure. The generation script must enforce this via structured prompting (and retry/parse if the model deviates).

```json
{
  "date": "2025-02-19",
  "model": "claude-sonnet-4-20250514",
  "model_display_name": "Claude",
  "generated_at": "2025-02-19T13:00:00Z",
  "market_context": "Brief 2-3 sentence summary of what the model sees in the market today",
  "predictions": [
    {
      "id": "pred_claude_20250219_001",
      "ticker": "AAPL",
      "prediction_type": "price_direction",
      "direction": "up",
      "target_price": 248.50,
      "current_price_at_prediction": 245.00,
      "timeframe": "end_of_day",
      "confidence": 0.72,
      "reasoning": "2-3 sentence explanation of why the model expects this"
    },
    {
      "id": "pred_claude_20250219_002",
      "ticker": "SPY",
      "prediction_type": "price_direction",
      "direction": "down",
      "target_price": 598.00,
      "current_price_at_prediction": 602.30,
      "timeframe": "end_of_week",
      "confidence": 0.55,
      "reasoning": "..."
    }
  ]
}
```

**Rules for predictions:**
- Each model makes **3-5 predictions per day**
- At least one must be a major index (SPY, QQQ, DIA)
- Confidence is a float between 0.50 (coin flip) and 0.95 (highly confident)
- Timeframes allowed: `end_of_day`, `end_of_week`, `end_of_month`
- `prediction_type` is always `price_direction` for v1 (can expand later)
- `direction` is either `up` or `down`
- Models MUST provide a specific `target_price`, not just a direction

### Score Format

```json
{
  "date": "2025-02-19",
  "scored_at": "2025-02-19T21:30:00Z",
  "results": [
    {
      "prediction_id": "pred_claude_20250219_001",
      "model": "claude-sonnet-4-20250514",
      "model_display_name": "Claude",
      "ticker": "AAPL",
      "predicted_direction": "up",
      "predicted_target": 248.50,
      "actual_close": 247.80,
      "actual_direction": "up",
      "direction_correct": true,
      "target_accuracy": 0.997,
      "confidence_at_prediction": 0.72,
      "score": 1.44,
      "status": "resolved"
    }
  ]
}
```

**Scoring formula (for v1):**
- **Direction correct:** `+1 * confidence` (reward high-confidence correct calls)
- **Direction wrong:** `-1 * confidence` (punish high-confidence wrong calls)
- **Bonus:** If the actual close is within 1% of the target price, add `+0.5`
- This means confident correct predictions score high, confident wrong predictions are heavily penalized, and low-confidence hedging earns little either way — mimicking how real trading conviction works.

### Leaderboard Format

```json
{
  "last_updated": "2025-02-19T21:30:00Z",
  "models": [
    {
      "model_display_name": "Claude",
      "total_predictions": 47,
      "correct_directions": 29,
      "direction_accuracy": 0.617,
      "total_score": 12.4,
      "avg_confidence": 0.68,
      "current_streak": 3,
      "best_streak": 7,
      "worst_streak": -4,
      "weekly_scores": [
        { "week": "2025-W08", "score": 3.2, "predictions": 15, "accuracy": 0.667 }
      ]
    }
  ]
}
```

---

## Pages & Frontend Structure

### 1. Home / Dashboard (`/`)
- **Hero section** with the project title, a one-liner tagline like *"Which AI sees the market clearest? A daily experiment."*
- **Today's snapshot:** A card for each AI model showing their predictions for today in a clean, scannable format. If predictions haven't been generated yet (before market open), show "Predictions incoming at 9:00 AM ET"
- **Leaderboard preview:** A compact scoreboard showing current rankings, total score, and direction accuracy for each model
- **Daily consensus section:** When multiple models agree on a ticker/direction, highlight it. When they disagree, highlight that too — disagreements are more interesting.
- **Recent notable calls:** A feed of the best and worst recent predictions (biggest wins, most embarrassing misses)

### 2. Individual Model Pages (`/model/:name`)
- One page per AI model (e.g., `/model/claude`, `/model/perplexity`, `/model/gemini`)
- **Model profile:** Display name, which API/model version is used, a brief personality description
- **Today's predictions** in full detail with reasoning
- **Historical performance:** Charts showing cumulative score over time, accuracy trend, average confidence
- **Full prediction history** in a sortable/filterable table
- **Streak tracker:** Current hot/cold streak

### 3. Scoreboard (`/scoreboard`)
- **Full leaderboard table** with all metrics: total score, accuracy, avg confidence, total predictions, best/worst streaks
- **Weekly breakdown** — a table or chart showing each model's weekly score over time
- **Head-to-head comparisons** — when two models predicted the same ticker on the same day, who was right?
- **Score over time chart** — line chart of cumulative score per model

### 4. Weekly Report (`/weekly`)
- **This week's recap** — auto-generated summary of the week's highlights
- **Best call of the week** — the single prediction with the highest score
- **Worst call of the week** — the biggest miss
- **Consensus accuracy** — how often all models agreed and whether the consensus was right
- **Score changes** — who gained/lost the most this week
- **Previous weeks** accessible via a dropdown or archive links

### 5. Methodology (`/methodology`)
- **Full transparency:** The exact system prompt given to each model (or a shared base prompt if they all get the same one)
- **Scoring formula** explained clearly with examples
- **Data sources** for market prices used in scoring
- **Schedule** — when predictions are generated, when scoring happens
- **Limitations and disclaimers** — this is an experiment, not financial advice. Models have access to the internet but that doesn't mean they can predict markets. The interesting thing is the relative comparison.
- **Link to the GitHub repo** for full source code

### 6. About (`/about`)
- What this project is and why it exists
- Brief bio / link to your portfolio
- How to follow along (link to repo, maybe RSS for weekly reports)
- Tech stack overview

---

## GitHub Actions Workflows

### Morning Workflow (`morning.yml`)
- **Schedule:** Runs at 8:30 AM ET (13:30 UTC) on weekdays only
- **Steps:**
  1. Checkout repo
  2. Install Python dependencies
  3. Run `scripts/generate.py` which:
     - Calls each AI API with internet/search enabled
     - Gives each model the same base prompt + today's date
     - The prompt instructs them to research current market conditions and make 3-5 specific predictions
     - Parses and validates the response into the prediction JSON schema
     - Retries up to 2 times if a model's output doesn't parse correctly
     - Saves each model's predictions to `/data/predictions/YYYY-MM-DD/{model_name}.json`
  4. Run `scripts/summarize.py --daily` which:
     - Reads all models' predictions for today
     - Generates a brief daily summary (can use a cheap model like Haiku for this)
     - Saves to `/data/summaries/daily/YYYY-MM-DD.json`
  5. Build the React frontend (`npm run build`)
  6. Commit all new data files + built frontend
  7. Push to main branch
  8. Deploy to GitHub Pages

### Evening Workflow (`evening.yml`)
- **Schedule:** Runs at 5:30 PM ET (22:30 UTC) on weekdays only
- **Steps:**
  1. Checkout repo
  2. Install Python dependencies
  3. Run `scripts/score.py` which:
     - Looks for all unscored `end_of_day` predictions from today
     - Fetches actual closing prices via financial data API
     - Scores each prediction using the scoring formula
     - Saves results to `/data/scores/YYYY-MM-DD.json`
     - Updates `/data/leaderboard.json` with new cumulative stats
     - Also checks for any `end_of_week` or `end_of_month` predictions that are now due for scoring
  4. Build the React frontend
  5. Commit and push
  6. Deploy to GitHub Pages

### Weekly Workflow (`weekly.yml`)
- **Schedule:** Runs Saturday at 10:00 AM ET (15:00 UTC)
- **Steps:**
  1. Checkout repo
  2. Run `scripts/summarize.py --weekly` which:
     - Aggregates all scores from the past week
     - Uses an AI model to generate a narrative weekly recap
     - Identifies best/worst calls, consensus hits/misses, biggest movers on the leaderboard
     - Saves to `/data/summaries/weekly/YYYY-WXX.json`
  3. Build, commit, push, deploy

---

## AI Prompt Design

### Base System Prompt (shared across all models, adapted to each API's format)

```
You are a market analyst participating in a daily AI prediction experiment.
Your task: Research current market conditions using your internet access,
then make 3-5 specific, falsifiable stock market predictions for today.

RULES:
1. You MUST research current pre-market data, overnight futures, recent news,
   and any relevant economic events before making predictions.
2. Each prediction must include: ticker symbol, direction (up/down),
   a specific target price, a timeframe, a confidence level (0.50-0.95),
   and 2-3 sentences of reasoning.
3. At least ONE prediction must be on a major index: SPY, QQQ, or DIA.
4. Be honest about your confidence. 0.50 means you're guessing.
   0.90+ means you see very strong signals.
5. You are scored on accuracy. High-confidence wrong calls are penalized heavily.
   Low-confidence correct calls earn little. Be calibrated.
6. Your reasoning should reference specific data points, news, or technicals
   you found during your research.

Today's date: {date}
Market opens at 9:30 AM ET.

Respond with ONLY valid JSON in this exact format:
{schema}
```

### API-Specific Notes

Each API handles internet access differently. The generation script needs model-specific adapters:

- **Claude (Anthropic):** Use the messages API with the `web_search` tool enabled. Claude will automatically search when the prompt asks it to research.
- **Perplexity:** Use their chat completions API. Perplexity searches the internet by default — no special configuration needed. Their `sonar` models are ideal.
- **Google Gemini:** Use the `generateContent` endpoint with `google_search_retrieval` tool enabled for grounding.
- **OpenAI GPT-4o:** Use the chat completions API with the `web_search` tool.
- **xAI Grok:** Use their chat completions API with search enabled. Grok has native access to X/Twitter data which may give unique sentiment signals.

---

## File Structure (What Claude Code Should Generate)

```
ai-market-oracle/
├── .github/
│   └── workflows/
│       ├── morning.yml
│       ├── evening.yml
│       └── weekly.yml
├── data/
│   ├── predictions/          # Daily prediction JSONs (organized by date)
│   ├── scores/               # Daily scoring JSONs
│   ├── summaries/
│   │   ├── daily/
│   │   └── weekly/
│   ├── leaderboard.json      # Running scoreboard
│   └── seed/                 # Sample data for development
├── scripts/
│   ├── generate.py           # Main prediction generation script
│   ├── score.py              # Scoring engine
│   ├── summarize.py          # Daily/weekly summary generator
│   ├── adapters/             # Per-model API adapters
│   │   ├── __init__.py
│   │   ├── claude_adapter.py
│   │   ├── perplexity_adapter.py
│   │   ├── gemini_adapter.py
│   │   ├── openai_adapter.py
│   │   └── grok_adapter.py
│   ├── market_data.py        # Fetches actual prices for scoring
│   └── utils.py              # Shared utilities, schema validation
├── src/                      # React frontend (Vite)
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── PredictionCard.jsx
│   │   ├── LeaderboardTable.jsx
│   │   ├── ScoreChart.jsx
│   │   ├── ModelProfile.jsx
│   │   ├── WeeklySummary.jsx
│   │   └── ConsensusHighlight.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── ModelPage.jsx
│   │   ├── Scoreboard.jsx
│   │   ├── Weekly.jsx
│   │   ├── Methodology.jsx
│   │   └── About.jsx
│   ├── data/                 # Symlink or copy of /data for dev, built into static site
│   ├── App.jsx
│   ├── main.jsx
│   └── index.html
├── public/
├── package.json
├── vite.config.js
├── requirements.txt          # Python dependencies
├── PROMPT.md                 # The master AI system prompt (for transparency)
└── README.md
```

---

## Implementation Order (Suggested Phases for Claude Code)

### Phase 1: Project Scaffolding
- Initialize Vite + React project
- Set up routing (react-router-dom)
- Create all page shells with placeholder content
- Set up the `/data` directory structure with sample/seed JSON files that match the schemas above
- Get the frontend rendering with seed data

### Phase 2: Frontend Build
- Build all components and pages against the seed data
- Leaderboard table with sorting
- Score-over-time line charts (use recharts)
- Prediction cards with color coding (green for correct, red for wrong, gray for pending)
- Model profile pages with historical stats
- Weekly summary display
- Responsive design — should look good on mobile
- Design should feel clean, modern, slightly editorial — like a Bloomberg terminal meets a blog. Dark mode preferred.

### Phase 3: Python Backend Scripts
- `generate.py` with adapter pattern for each AI API
- `score.py` with the scoring formula
- `summarize.py` for daily/weekly narrative generation
- `market_data.py` for fetching actual prices
- All scripts should have robust error handling — if one API is down, the others should still run
- JSON validation on all outputs

### Phase 4: GitHub Actions
- Set up all three workflows (morning, evening, weekly)
- Configure cron schedules for US market hours
- Handle the build + commit + push + deploy cycle
- Set up repository secrets for all API keys

### Phase 5: Polish
- Add a proper README
- Fill out the Methodology and About pages
- Add meta tags and Open Graph images for social sharing
- Ensure the site has a good favicon and title

---

## Design Direction

- **Dark theme** — dark backgrounds (#0a0a0a or similar), bright accent colors for each AI model
- **Model color coding:** Assign each AI a distinct color used consistently everywhere
  - Claude: Orange (#E07A3A)
  - Perplexity: Teal (#20B2AA)
  - Gemini: Blue (#4285F4)
  - GPT-4o: Green (#10A37F)
  - Grok: White/Silver (#C0C0C0)
- **Typography:** Monospace for numbers/scores (IBM Plex Mono or similar), clean sans-serif for body text (Inter)
- **Vibe:** Quantitative, data-rich, but not sterile. Think: a smart person's dashboard, not a corporate BI tool.
- Charts should use subtle grid lines and be easy to read at a glance

---

## Environment Variables / Secrets Needed

These go in GitHub repo Settings → Secrets and Variables → Actions:

```
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
GOOGLE_GEMINI_API_KEY=...
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...
```

---

## Important Notes

- **Weekend/holiday handling:** Workflows only run on weekdays. The scripts should also check if the market is actually open (account for US market holidays). Use the `exchange_calendars` Python package or a simple hardcoded holiday list.
- **Rate limits and costs:** Perplexity and Gemini have generous free tiers. Claude, OpenAI, and Grok will cost a small amount per day. Budget roughly $1-3/day across all models.
- **Idempotency:** If a workflow runs twice by accident, it should not create duplicate predictions. Check if today's file already exists before generating.
- **Git conflicts:** Since Actions are the only thing pushing, conflicts shouldn't happen. But add `git pull --rebase` before push as a safety measure.
- **Disclaimer:** Add a clear "This is not financial advice" disclaimer on every page. This is an experiment/art project.
- **The frontend reads JSON files at build time or fetches them at runtime from the repo.** Since this is a static site, the simplest approach is to import the JSON data at build time using Vite's glob import or to have the build script copy the data into the public folder. Either works.

---

## Stretch Goals (Future Enhancements)

- RSS feed for daily predictions
- Email newsletter integration (weekly digest)
- User voting on which AI's reasoning sounds most convincing
- Sector-specific prediction challenges (tech week, energy week, etc.)
- Backtesting mode where you feed historical data and see how models would have performed
- Social sharing cards — auto-generated images showing today's predictions for Twitter/LinkedIn
- Sound a gong (notification) when all models agree on a direction
