# Project Report Plan — Oracle Trade

**Purpose:** Blueprint for the 5–7 page Final Project Report graded against the course rubric (`docs/report_instructions.md`). Maps every required section to concrete content, figures/tables, and citations drawn from this codebase and the live data artifacts.

**Working title for the report:** *Oracle Trade: A Consensus-Trading Platform Powered by a Five-Model Advisor LLM Panel*

**Page budget (target 6 pages of body, ~600–650 words/page):**
- p. 1 — Cover
- p. 2 — Table of Contents + Glossary
- p. 3 — Executive Summary
- p. 4 — Problem Statement
- pp. 5–6 — Results (with figures/tables)
- p. 7 — Conclusion + References

If we run long, push Glossary onto p. 3 next to the TOC and let Results expand into pp. 4–6. Cover page does not count toward body pages.

---

## 1. Cover Page (p. 1)

Drop-in template — fill the bracketed values from Canvas:

```
[Course Title], [Term] [Year]
Document: Project Report
Team Name: [Team Name]
Project Name: Oracle Trade
Team Number: [from Canvas]
Team Members:
  - [Team Lead — Last, First] · Section [X] · [email]
  - [Member 2] · Section [X] · [email]
  - [Member 3] · Section [X] · [email]
Date: [submission date]
```

**Design note:** Center-aligned, dark-on-white (the report is print-graded, not screen-rendered). Add the Oracle Trade wordmark or a single screenshot of the live dashboard as a visual anchor — keep it small so the text dominates.

---

## 2. Table of Contents (p. 2, top half)

Auto-generate from numbered headings. Required entries:

1. Executive Summary ……………………………… p. X
2. Problem Statement ……………………………… p. X
3. Solution Overview …………………………………… p. X
4. Methodology / System Design ………………… p. X
5. Results …………………………………………………… p. X
6. Conclusion ……………………………………………… p. X
7. References ……………………………………………… p. X

(Sections 3 and 4 are additions allowed by the rubric — both are necessary so the Results section has something to reference. Numbering applies to **headings AND pages**, per the instructions.)

---

## 3. Glossary (p. 2, bottom half)

Twelve terms is the right count — enough to look thorough, short enough to fit half a page. Use the marketing playbook's lexicon (`docs/marketing.md` §2) so the language is consistent across deliverables.

| Term | One-line definition |
|---|---|
| **Advisor LLM** | One of the five frontier language models in the panel (Claude, GPT-4o, Gemini, Perplexity, Grok). |
| **Advisor Panel** | The five-model ensemble that generates daily forecasts. |
| **Consensus Trade** | A trade that executes only when ≥ 4 of 5 Advisors agree on direction and ticker. |
| **Conviction Threshold** | The 4-of-5 agreement rule that gates execution. |
| **Confidence-Weighted Scoring** | Scoring formula: +confidence if correct, −confidence if wrong, +0.5 bonus within 1% of target. |
| **Calibration** | Whether stated confidence matches realized accuracy (e.g., 70% conf → 70% hit rate). |
| **Pre-Market Conditioning** | The standardized data block (yfinance + FRED) injected into every Advisor's prompt. |
| **Falsifiable Prediction** | A forecast with explicit ticker, direction, target price, timeframe, and confidence. |
| **Leaderboard** | The auditable, append-only record of every Advisor's scored predictions. |
| **Herding** | The degree to which Advisors agree; tracked daily as a bias check. |
| **Head-to-Head Record** | Pairwise win-loss-tie between Advisors on same-ticker, same-day calls. |
| **Hit Rate** | Direction-correct percentage on consensus trades (currently 83%). |

---

## 4. Executive Summary (p. 3, ≤ 1 page)

**Length target:** 250–350 words. Must be self-contained — graded as marketing copy. Lift phrasing directly from the marketing playbook so the report and pitch reinforce each other.

**Skeleton:**

- **Hook (2 sentences).** Retail investors lose to the market not because they lack information but because they lack discipline; Oracle Trade replaces individual judgment with a systematic, auditable, multi-model consensus.
- **What it is (3–4 sentences).** Every weekday morning at 8:30 AM ET, an independent panel of five Advisor LLMs — Claude, GPT-4o, Gemini, Perplexity, Grok — receives the same standardized research brief and returns 3–5 falsifiable predictions each. When ≥ 4 of 5 agree on a ticker and direction, Oracle Trade fires a consensus trade; when they don't, it stays out.
- **Why now (1–2 sentences).** Frontier LLMs only crossed the threshold of *calibrated, instruction-followable* market reasoning in the last 12 months. Aggregating them is a wedge that no single-vendor lab will pursue.
- **Traction (2–3 sentences).** 60 days live, 525 predictions scored against real closes, **83% directional correctness on consensus trades**, +9% paper-traded portfolio return, all auditable on a public leaderboard.
- **Audience impact (1–2 sentences).** For retail investors who want a systematic alternative to news-driven trading, Oracle Trade delivers the rigor of a quant desk with the simplicity of a watchlist. For investors evaluating the company, the receipts are the moat.
- **Close (1 sentence).** This report walks through the problem, the architecture, and the live results.

**Voice rule:** every claim anchors to a number. No "revolutionary," no "disrupt," no rocket emojis (per marketing.md §10).

---

## 5. Problem Statement (p. 4)

**Length target:** ~600 words. The strongest version of this section frames *three* converging gaps, not one — gives the Results section more to answer.

### 5.1 The retail investor's discipline gap
- 60% of active retail traders underperform the S&P 500 over five years (cite Barber & Odean 2000; updated FINRA / Dalbar data).
- Cause is well-documented: overconfidence, recency bias, news-chasing, lack of position sizing.
- A systematic, rules-based alternative exists for institutions (quant funds) but is structurally inaccessible to retail.

### 5.2 The "lone-LLM" problem
- Single-model AI tools (ChatGPT, Bard, Perplexity used standalone) inherit each model's training biases, hallucination patterns, and guardrails.
- No accountability layer — output is conversational, not falsifiable.
- No way to tell whether a confident-sounding answer is *calibrated* or *bluffing*.

### 5.3 The trust gap in retail fintech
- Most "AI trading" products publish marketing claims, not audit logs.
- Industry standard: backtests on cherry-picked windows, no live track record, opaque methodology.
- Users have no mechanism to verify performance claims independently.

### 5.4 Why these three gaps converge here
Solving any one in isolation is incomplete: a systematic tool with no track record is unbelievable; a track record with one model is biased; either without consumer-grade execution is a lab experiment. Oracle Trade's thesis is that the **panel + the receipts + the brokerage layer** together close all three gaps simultaneously.

**Figure 1 (placement: bottom of p. 4):** A single diagram — three overlapping circles ("Discipline gap," "Single-model bias," "Trust gap") with "Oracle Trade" sitting in the intersection. Caption: *Figure 1. Three gaps in retail trading that converge into a single product opportunity.*

---

## 6. Solution Overview & System Design (added section, p. 5 top)

**Length target:** ~250–300 words. Bridges the Problem and Results — without it, Results numbers float in space.

### 6.1 Architecture (one paragraph + Figure 2)

Five components, in pipeline order:

1. **Pre-market data conditioning** — `yfinance` (SPY, QQQ, DIA, key tickers, VIX, ^TNX) + FRED (DGS10, DGS2, FEDFUNDS, CPIAUCSL, UNRATE, T10Y2Y) standardized into a single block.
2. **Advisor LLM panel** — five adapters (`scripts/adapters/*.py`), each calling its provider's chat-completions endpoint with web-search enabled and a shared research brief.
3. **Consensus aggregation** — `scripts/winner.py` filters for ≥ 3 model agreement on ticker + direction (production threshold currently 3, marketed as 4-of-5; reconcile before final draft — see §10 Open Items).
4. **Scoring engine** — `scripts/score.py` fetches actual closes via `yfinance` and applies the confidence-weighted formula.
5. **Public surfaces** — React frontend (Vite) on GitHub Pages: leaderboard, analytics, simulator, methodology, daily/weekly summaries.

**Figure 2 (placement: middle of p. 5):** The 7-box pipeline diagram from `docs/marketing.md` §9 (15-min deep-dive) — pre-market data → panel → research brief → consensus → portfolio/alerts → broker execution → public scoring. Caption: *Figure 2. Oracle Trade end-to-end pipeline. Every layer, including the research brief, is publicly documented in the project repository.*

### 6.2 Why five specific models
One sentence each: diversity of training data, diversity of alignment approach, **uncorrelated failure modes** (the load-bearing claim).

### 6.3 What's documented
Everything that defines the system's behavior is published. The full research brief is in `PROMPT.md`. The aggregation rule, scoring formula, data sources, per-Advisor adapter logic, and full track record are all in the public repository. The report should reference these directly rather than describing them at arm's length.

---

## 7. Results (pp. 5 bottom – 6, the heavyweight section)

**Length target:** ~1.2 pages. The rubric leaves Results blank, which is a hint to make it the strongest section. Anchor every paragraph to a number from the live data artifacts.

### 7.1 Headline metrics (bullet block at section open)
- **525** predictions scored across **60** trading days.
- **83%** directional correctness on consensus trades (5 of 6 closed).
- **+9%** paper-traded portfolio return since launch.
- **5/5** Advisor LLMs operational (after the Gemini fix on 2026-04-09 — see `IMPROVEMENT_PLAN.md`).
- **0** missed runs across the 60-day live window (after DST fix).

### 7.2 Per-model performance — Table 1
Pulled from `data/leaderboard.json`. Columns: Model · Total Predictions · Direction Accuracy · Total Score · Avg Confidence · Best Streak · Worst Streak. Shows GPT-4o leading on score, Perplexity on accuracy, etc. The *spread* between models is the point — it's evidence that aggregating them is meaningful.

*Table 1. Per-Advisor performance over 60 trading days. Source: data/leaderboard.json.*

### 7.3 Calibration — Figure 3
Line chart from `data/analytics.json` calibration buckets. X-axis: stated confidence bucket (50–59, 60–69, 70–79, 80–89, 90+). Y-axis: realized hit rate. Dashed 45° reference line for perfect calibration. Annotate the panel-wide calibration error. *This single chart is the most institutional-grade artifact in the report.*

*Figure 3. Confidence calibration across the Advisor panel. Models track the perfect-calibration line within ±[X]%, validating that stated confidence is informative rather than cosmetic.*

### 7.4 Consensus trades — Table 2
The 6 closed consensus trades by date. Columns: Date · Ticker · Direction · Models Agreeing · Entry · Exit · Result · Score. Five wins, one loss. Caveat the sample size honestly — per marketing.md §5, transparency about small *n* reads as sharp, not weak.

*Table 2. Closed consensus trades to date. 5 of 6 directionally correct (83%).*

### 7.5 Head-to-head — Figure 4 (optional, drop if tight on space)
Pairwise matrix from `data/analytics.json` `head_to_head`. Demonstrates **independence**: if Advisors herded, the matrix would be all ties. The fact that GPT-4o beats Claude 16-2 on same-day same-ticker calls is *evidence the consensus rule is doing real work.*

*Figure 4. Pairwise head-to-head record on same-day same-ticker calls. Decisive (non-tie) outcomes only.*

### 7.6 Operational results (one short paragraph)
60-day uptime, 0 missed runs post-DST fix, gracefully handled 1 model outage (Gemini, days 1–33), and continues to generate predictions even when one adapter fails. This paragraph quietly makes the "operational discipline" moat argument from `marketing.md` §7.

---

## 8. Conclusion (p. 7)

**Length target:** ~250 words.

**Three beats:**

1. **What we built.** Restate the architecture in one sentence; restate the headline number (83% across 60 days).
2. **What it proves.** That a properly aggregated multi-LLM panel produces *calibrated, falsifiable, scoreable* market signals — not just plausible-sounding text. The receipts are the load-bearing argument.
3. **What's next.** Roadmap items (in priority order, drawn from `marketing.md` §9 and `future_changes.md`):
   - Stable shared watchlist for cleaner head-to-head benchmarking.
   - Larger consensus sample (target 50+ closed trades before broader marketing).
   - Options and sector-specific Advisor panels.
   - Institutional API tier ($499/mo) and white-label channel.

**Closing line (memorize it from `marketing.md` §7):** *A competitor starting today can replicate the architecture in a week; they cannot replicate the receipts. Trust in this category compounds daily.*

---

## 9. References (p. 7, bottom — APA format)

Plan a minimum of **8 references** so the bibliography looks substantive without padding. Categories:

**Behavioral finance (Problem Statement):**
- Barber, B. M., & Odean, T. (2000). Trading is hazardous to your wealth: The common stock investment performance of individual investors. *Journal of Finance*, 55(2), 773–806.
- Dalbar, Inc. (latest year available). *Quantitative Analysis of Investor Behavior.*
- FINRA Investor Education Foundation. (latest). *Investors in the United States* report.

**LLM capability / methodology:**
- Anthropic. (2025). *Claude model card / web search tool documentation.* https://docs.anthropic.com
- OpenAI. (2025). *GPT-4o documentation / web search.* https://platform.openai.com/docs
- Google DeepMind. (2025). *Gemini 2.5 model documentation.* https://ai.google.dev
- Perplexity AI. (2025). *Sonar Pro API documentation.* https://docs.perplexity.ai
- xAI. (2025). *Grok API documentation.* https://docs.x.ai

**Data sources:**
- Federal Reserve Bank of St. Louis. (n.d.). *FRED Economic Data.* https://fred.stlouisfed.org
- Yahoo Finance / yfinance. (n.d.). https://github.com/ranaroussi/yfinance

**Project artifacts (cite as primary sources, since the report is *about* them):**
- Oracle Trade. (2026). Live leaderboard. `data/leaderboard.json`.
- Oracle Trade. (2026). Analytics output. `data/analytics.json`.
- Oracle Trade. (2026). System architecture and design specification. Internal repository.

**Citation rule:** Every claim in §5 (Problem Statement) needs an external citation. Every claim in §7 (Results) needs an internal artifact citation. No bare assertions.

---

## 10. Open items to lock down before final draft

| # | Question | Where to resolve |
|---|---|---|
| 1 | Reconcile **4-of-5** (marketed) vs **3-of-5** (`MIN_MODELS_AGREEING = 3` in `scripts/winner.py`). The report must state the actual production threshold and explain it. | `scripts/winner.py:4`, marketing.md §1 |
| 2 | Confirm **83% / 5-of-6** is still the current rolling number — pull from `data/analytics.json` and `data/simulator.json` the day of submission. | `data/analytics.json`, `data/simulator.json` |
| 3 | Confirm **525 predictions / 60 trading days** is current at submission time. | `data/leaderboard.json` totals |
| 4 | Generate Table 1 and Figure 3 from real artifacts — do not hand-fabricate numbers. | `data/leaderboard.json`, `data/analytics.json` |
| 5 | Decide whether to include Figure 4 (head-to-head) — drop if the page count is tight. | Page budget |
| 6 | Confirm Gemini has appeared in the leaderboard with scored predictions before claiming "5/5 operational." If not, soften to "5/5 operational; Gemini's first scored predictions land in the next pipeline run." | `data/leaderboard.json` Gemini row |

---

## 11. Style & formatting checklist (rubric compliance)

- [ ] Page numbers on every page (footer, right-aligned).
- [ ] Headings numbered (1, 1.1, 1.2, …) and in the TOC with matching page numbers.
- [ ] Every figure has a number, title, and caption beneath it.
- [ ] Every table has a number, title, and caption above or below it.
- [ ] Every figure/table is **introduced in the body text** before it appears ("Figure 1 illustrates…").
- [ ] APA in-text citations (Author, Year) for every external source.
- [ ] Bibliography in APA format, alphabetized by first author, hanging indent.
- [ ] Body length 5–7 pages (excluding cover).
- [ ] Times New Roman 12pt or equivalent, 1.5 line spacing, 1" margins (whatever the course default is — confirm with the syllabus).
- [ ] No first-person ("I built…") in the body. Use the product's voice ("Oracle Trade runs…").
- [ ] Disclaimer footer on the cover page: *This document describes a research/demonstration project. Not financial advice.*

---

## 12. Drafting workflow (suggested)

1. **Day 1 — gather numbers.** Pull `data/leaderboard.json`, `data/analytics.json`, `data/simulator.json` snapshots into a working spreadsheet. This is the single source of truth for every claim in §7.
2. **Day 1 — draft cover, TOC, glossary.** Mechanical; get them out of the way.
3. **Day 2 — draft Executive Summary and Problem Statement.** Use the marketing playbook's voice as a style guide.
4. **Day 2 — generate figures.** Calibration chart (Figure 3) and consensus-trade table (Table 2) are the two highest-value visuals.
5. **Day 3 — draft Solution Overview and Results.** The hardest sections. Anchor every paragraph to a number or a citation.
6. **Day 3 — draft Conclusion and References.** APA-format the bibliography last; it's tedious.
7. **Day 4 — page-count pass.** If over 7 pages, the first thing to cut is §6.2 ("why five specific models") — that lives better in the presentation.
8. **Day 4 — proof against the rubric checklist (§11).** Final read-through aloud.

---

## 13. Disclosure

Nothing about the system is held back. The full research brief is in `PROMPT.md` and should be reproduced in an appendix or quoted directly in the Solution Overview where it strengthens the argument. The data conditioning logic, adapter implementations, scoring math, position-sizing rules, and live track record are all publicly documented and fair game for the report.

---

*End of report plan. Pair with `presentation_plan.md` — the two are designed to share vocabulary, statistics, and figures so the report and the pitch reinforce each other.*
