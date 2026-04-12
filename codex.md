# Codex Resume Notes

## Purpose

Use this file when resuming work on this repo after the current QA pass.

The next session should:
1. Re-read the core project docs listed below.
2. Re-read `qa.md`.
3. Inspect the user's fixes against the findings in `qa.md`.
4. Verify the fixes with code inspection and safe local checks.
5. Only after that, start a second QA session for anything still unresolved or newly introduced.

## Read These First

1. [CLAUDE.md](/Users/amilonas/Desktop/code/ai-market-oracle/CLAUDE.md)
2. [AI_MARKET_ORACLE_SPEC.md](/Users/amilonas/Desktop/code/ai-market-oracle/AI_MARKET_ORACLE_SPEC.md)
3. [IMPROVEMENT_PLAN.md](/Users/amilonas/Desktop/code/ai-market-oracle/IMPROVEMENT_PLAN.md)
4. [qa.md](/Users/amilonas/Desktop/code/ai-market-oracle/qa.md)

## Current State Summary

The repo has already been audited once.

Key verified context from the last session:
- Priorities 1 through 5 from `IMPROVEMENT_PLAN.md` are present in committed code on `master`.
- Priority 6 analytics exists in code, but in the last audit it was still not landed on `master` and the generated analytics JSON artifact was missing locally.
- `npm run build` passed locally.
- Full Python runtime verification was limited because the local machine had Python `3.9.6`, while the workflows target Python `3.12`.

## Main Files Touched During QA

- [qa.md](/Users/amilonas/Desktop/code/ai-market-oracle/qa.md)
- [scripts/score.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/score.py)
- [.github/workflows/deploy.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/deploy.yml)
- [.github/workflows/morning.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/morning.yml)
- [.github/workflows/evening.yml](/Users/amilonas/Desktop/code/ai-market-oracle/.github/workflows/evening.yml)
- [scripts/generate.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/generate.py)
- [scripts/utils.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/utils.py)
- [scripts/fred_data.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/fred_data.py)
- [scripts/analytics.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/analytics.py)
- [scripts/winner.py](/Users/amilonas/Desktop/code/ai-market-oracle/scripts/winner.py)
- [src/data/useData.js](/Users/amilonas/Desktop/code/ai-market-oracle/src/data/useData.js)
- [src/pages/Home.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Home.jsx)
- [src/pages/Weekly.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Weekly.jsx)
- [src/pages/ModelPage.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/ModelPage.jsx)
- [src/pages/Scoreboard.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/Scoreboard.jsx)
- [src/pages/About.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/pages/About.jsx)
- [src/components/ScoreChart.jsx](/Users/amilonas/Desktop/code/ai-market-oracle/src/components/ScoreChart.jsx)
- [requirements.txt](/Users/amilonas/Desktop/code/ai-market-oracle/requirements.txt)

## What The Next Session Should Check First

Start by comparing the current repo state against the findings in `qa.md`, in this order:

1. `CRITICAL`
2. `MEDIUM`
3. `MINOR`

For each item:
- confirm whether it is fixed, partially fixed, or still present
- cite the file and line references
- run safe checks when possible
- distinguish between:
  - code present but not committed
  - code committed but not verified
  - code verified locally

## Suggested Verification Commands

Use these first if still relevant:

```bash
git status --short
git log --oneline --decorate -n 20
npm run build
python3 --version
rg -n "CRITICAL|MEDIUM|MINOR" qa.md
```

Then inspect specific fixes by file.

## Important Constraints

- If local Python is still not `3.12`, do not overstate Python runtime verification.
- If a fix is only present in the working tree, say so explicitly.
- If context starts getting tight, tell the user before continuing deeper.
- The next session should review fixes first, not jump straight into a brand new QA sweep.

## Expected Next User Intent

The likely next request will be some version of:
"Review my fixes against `qa.md` and tell me what is resolved before doing another QA pass."

That should be treated as the first task on resume.
