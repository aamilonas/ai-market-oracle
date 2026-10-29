# Handoff — 2026-10-29

Where things stand, so work can resume on another machine.

## Goal

The Skool class is over; this is now a personal project. Keep evaluating every model on
prediction quality, then use the best model (or committee of models) as trade signals for a
future agent that texts trade picks. See `CLAUDE.md` for architecture and conventions.

## Current state

- All models run through **OpenRouter** with one secret, `OPENROUTER_API_KEY` (set in GitHub
  Actions secrets). `FRED_API_KEY` is optional.
- Lineup (`models.json`, 9 active): Claude Sonnet 5.5, GPT-5.6 Terra, Gemini 3.8 Flash,
  Grok 4.3, Perplexity Sonar Pro, DeepSeek V4 Pro, Kimi K3.1 Pro, Hermes 4 405B, Qwen 3.8 Max.
- All pre-migration data was deleted. **2026-10-29 is the first day of data** (9/9 models
  succeeded, run started manually at 10:21 AM ET).
- Cost: about **$0.47 per run** (~$10/month). Per-model cost, latency and citation counts are in
  `data/runs/<date>.json`.
- The `school` branch is an archive of the class version; the sync workflow was removed.

## Recent changes

- `4e5652f` — OpenRouter migration: single adapter, shared prompt (`scripts/prompts/`),
  live yfinance price as scoring baseline, data reset, frontend driven by `models.json`,
  new Analytics section "Who Should a Trader Follow?" (per-model + committee tables).
- `e7358e4` — fixed a nested `public/data/data` mirror.
- `7735fc4` — Grok 4.7 → Grok 4.3 (4.7's native search read ~366k tokens, $0.85/run;
  4.3 costs ~$0.04) and added Qwen 3.8 Max as an experimental model.

## Open items

1. **Unreliable morning cron.** GitHub skipped the 10:07 UTC run on 2026-10-29. Idea: trigger
   `morning.yml` from an external scheduler (e.g. cron-job.org or a scheduled agent calling
   the `workflow_dispatch` API) so predictions land before the open.
2. **Claude and GPT record 0 citations.** Their answers reference current news, but the data
   can't confirm their native search actually ran. Worth checking the OpenRouter response
   format for those providers.
3. **Qwen 3.8 Max** is slow (~3 min) and sometimes needs the JSON repair pass. Watch that it
   doesn't start failing.
4. **Picking models for the trader:** wait for data. Committees appear in Analytics after 10
   shared signals; aim for 50+ (~6–8 weeks). Look for a high conservative accuracy (Wilson lower
   bound), a positive average return, enough signals per day, and a low Brier score. Hint from
   the old (pre-reset, different model versions) data: 3 diverse models agreeing was right ~90%
   of the time on a small sample, versus 50–60% for single models.
5. Later: build the trading agent that texts picks.

## Changing the lineup

- Add a model: add an entry to `models.json`, plus an empty row in `data/leaderboard.json`
  (or let the next scoring run seed it), then mirror to `public/data/`.
- Upgrade a model that already has data: add a new entry with a new `slug` and set the old one
  to `"active": false`, so records never mix versions.
- Test without saving: run the **Morning** workflow manually with `dry_run` checked, optionally
  with `models` set to a comma-separated list of slugs.

## Setup on a new machine

```bash
git clone https://github.com/aamilonas/ai-market-oracle.git
cd ai-market-oracle
npm install
pip install -r requirements.txt
# for local runs, export OPENROUTER_API_KEY (and optionally FRED_API_KEY); never commit them
npm run dev
```

Claude Code's memory for this project lives on the original machine
(`~/.claude/projects/.../memory/`); this file covers everything in it.
