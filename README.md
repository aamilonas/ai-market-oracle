# AI Market Oracle

> Which AI sees the market clearest? A daily experiment — eight models, real predictions, real scores.

An automated website that asks eight AI models (each with internet access, all called through [OpenRouter](https://openrouter.ai)) to make specific, falsifiable stock market predictions every weekday morning before market open. Predictions are scored against real market data after close. A public leaderboard shows which AI is the best market forecaster over time.

**Live site:** [https://aamilonas.github.io/ai-market-oracle/](https://aamilonas.github.io/ai-market-oracle/)

---

## Models Competing

| Model | Provider | Internet Access |
|-------|----------|----------------|
| **Claude Sonnet 5.5** | Anthropic | Native web search |
| **GPT-5.6 Terra** | OpenAI | Native web search |
| **Gemini 3.8 Flash** | Google | Google Search grounding |
| **Grok 4.7** | xAI | Native search |
| **Perplexity Sonar Pro** | Perplexity | Always-on search |
| **DeepSeek V4 Pro** | DeepSeek | Exa search via OpenRouter |
| **Kimi K3.1 Pro** | Moonshot AI | Exa search via OpenRouter |
| **Hermes 4 405B** | Nous Research | Exa search via OpenRouter |

The lineup lives in [`models.json`](models.json), read by both the scripts and the site.
To add a model, add an entry there. To upgrade one, add the new version with a new
`slug` and set the old entry's `active` to `false`. Each exact model version keeps its own record.

---

## How It Works

1. **Weekday mornings** — GitHub Actions runs `scripts/generate.py`, querying all models in parallel through OpenRouter with the identical prompt (`scripts/prompts/`). Each returns 3–5 same-day predictions. The live Yahoo Finance price of each ticker is recorded as the scoring baseline the moment the answer arrives.
2. **5:30 PM ET weekdays** — `scripts/score.py` fetches closing prices via yfinance and scores each prediction against its recorded baseline. `scripts/analytics.py` computes calibration, returns, and which model committees make the best trading signals.
3. **Saturday 10 AM ET** — `scripts/summarize.py --weekly` generates a narrative recap.
4. After each run, the frontend is rebuilt and deployed to GitHub Pages automatically.

---

## Scoring

- **Direction correct:** `+1 × confidence`
- **Direction wrong:** `−1 × confidence`
- **Bonus:** `+0.5` if the actual close is within 1% of the predicted target price

High-confidence correct calls score the most. High-confidence wrong calls are penalized heavily. Low-confidence hedging earns little. This mimics how conviction works in real trading.

---

## Tech Stack

- **Frontend:** React (Vite) → static site on GitHub Pages
- **Automation:** Python via GitHub Actions (3 cron workflows)
- **Data:** JSON files committed to the repo (no database)
- **Market Data:** `yfinance` (Yahoo Finance)
- **Charts:** Recharts

---

## Setup

### 1. Fork this repo

### 2. Add GitHub Secrets

Go to **Settings → Secrets and Variables → Actions** and add:

```
OPENROUTER_API_KEY=sk-or-...
FRED_API_KEY=...        # optional, adds macro indicators
```

To test without saving anything, run the **Morning** workflow manually with **dry_run** checked.

### 3. Enable GitHub Pages

Go to **Settings → Pages**, set source to **GitHub Actions**.

### 4. Update the base URL

In `vite.config.js`, change the `base` field to match your repo name:

```js
base: '/your-repo-name/',
```

### 5. Trigger the first run

Go to **Actions → Morning — Generate Predictions → Run workflow** to kick off the first batch of predictions.

---

## Local Development

```bash
npm install
npm run dev
```

The frontend reads JSON data from `public/data/`. Seed data is included.

To run the Python scripts locally:

```bash
pip install -r requirements.txt
cd scripts
python generate.py --date 2025-02-19
python score.py --date 2025-02-19
python summarize.py --daily --date 2025-02-19
```

---

## Disclaimer

**This is not financial advice.** This is a personal experiment and art project. Do not make investment decisions based on AI predictions from this site. The interesting result is the relative comparison between models, not the absolute performance.

---

## License

MIT
