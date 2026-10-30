# AI Market Oracle — Methodology

**Last updated:** 2026-10-29

A controlled experiment testing whether any AI model, or any combination of AI models,
can profitably forecast same-day stock movements when every model is given identical
information.

This document is a complete specification of the method: the question, the information
set, the exact prompts, the exact scoring mathematics, every threshold, the measurement
layer, and the known defects. It is written to be critiqued. Where a design choice is
weak, it says so.

> ## ⚠️ Read this first: the experiment has no results yet
>
> As of 2026-10-29 there are **zero scored predictions**. The dataset was reset when the
> project migrated to a single API gateway and the model lineup changed. Today is the
> first day of data collection, and its predictions have not yet resolved.
>
> **Current state:** 1 day of predictions (35 predictions across 9 models) · 0 resolved ·
> 0 scored days · leaderboard empty · committee analytics have never run on real data ·
> paper simulator holds 1 open trade.
>
> Everything in §8 (measurement) and §9 (trading) is implemented and untested against
> real outcomes. Everything in §13 is proposed and unimplemented.
>
> **This means structural changes cost nothing right now.** There is no track record to
> invalidate, no comparability to preserve, and no sunk history. If the design is wrong,
> this is the cheapest moment in the project's life to change it.

---

## Table of contents

1. [The central question](#1-the-central-question)
2. [The cocktail thesis](#2-the-cocktail-thesis)
3. [The lineup](#3-the-lineup)
4. [The daily cycle](#4-the-daily-cycle)
5. [What every model receives](#5-what-every-model-receives)
6. [The baseline](#6-the-baseline-and-why-it-is-the-crux)
7. [Scoring mathematics](#7-scoring-mathematics)
8. [The measurement layer](#8-the-measurement-layer)
9. [From prediction to trade](#9-from-prediction-to-trade)
10. [Every threshold in one place](#10-every-threshold-in-one-place)
11. [Operating constraints](#11-operating-constraints)
12. [Known defects and limitations](#12-known-defects-and-limitations)
13. [Open design questions](#13-open-design-questions)
14. [What would count as a result](#14-what-would-count-as-a-result)
15. [Questions for a reviewer](#15-questions-for-a-reviewer)
- [Appendix A — the verbatim system prompt](#appendix-a--the-verbatim-system-prompt)
- [Appendix B — the verbatim user prompt template](#appendix-b--the-verbatim-user-prompt-template)
- [Appendix C — a real rendered information block](#appendix-c--a-real-rendered-information-block)
- [Appendix D — the stored record of a prediction](#appendix-d--the-stored-record-of-a-prediction)
- [Appendix E — day-one observed behaviour](#appendix-e--day-one-observed-behaviour)

---

## 1. The central question

Nine AI models are asked the same question every weekday morning: *where will these
prices be at today's 4:00 PM ET close?* Answers are recorded, scored against the actual
close, and accumulated.

The question is narrower than "are AI models good at predicting markets":

> **Given identical information, which model — or which combination of models — produces
> the most profitable decisions?**

Each clause carries weight:

- **Given identical information.** Any difference in what models are told is a confound.
  If one model sees a price another doesn't, the comparison measures the data pipeline,
  not the models. This is the binding design constraint and absorbs most of the effort.
- **Which model — or which combination.** The hypothesis is that no single model is
  reliably best, but that *agreement between particular models* carries more signal than
  any member alone. Identifying those groupings is the goal.
- **The most profitable decisions.** Not accuracy. A model right 70% of the time on 0.1%
  moves is worth less than one right 55% of the time on 2% moves. Profitability is the
  target metric; accuracy is an intermediate diagnostic.

### What this experiment is not

- Not a test of multi-step or long-horizon forecasting. Horizon is fixed at same-day close.
- Not a test of whether models can trade. They produce forecasts; position sizing and
  execution are applied mechanically afterwards.
- Not a test of prompt engineering. Every model receives one prompt, unchanged, by design.
  Per-model prompt tuning would make the comparison measure the tuning.
- Not a live-capital strategy. All trading is simulated.

## 2. The cocktail thesis

The hypothesis is that the useful unit of prediction is not a model but a **committee** —
a specific set of models which, when they independently agree, are right more often than
any member alone.

The reasoning: different models are trained differently, read different sources, and fail
differently. If their errors are uncorrelated, agreement should carry more information
than a single opinion. If their errors *are* correlated — shared training data, same news
article — then agreement is nearly worthless and a committee of three is a committee of one.

Two claims are therefore under test simultaneously:

1. Whether any model forecasts same-day direction better than chance.
2. Whether model errors are independent enough that agreement adds information.

**The second claim matters more and is far harder to establish.** It is also the one the
current design is weakest at testing, for reasons given in §12. A committee that tops the
table may be three models reading the same article.

## 3. The lineup

Nine models, all called through one gateway (OpenRouter) so the request path is identical.
All active as of 2026-10-29.

| Model | Organisation | Search mode |
|---|---|---|
| Claude Sonnet 5.5 | Anthropic | Native (Anthropic web search) |
| GPT-5.6 Terra | OpenAI | Native (OpenAI web search) |
| Gemini 3.8 Flash | Google | Native (Google Search grounding) |
| Grok 4.3 | xAI | Native (xAI web + X search) |
| Perplexity Sonar Pro | Perplexity | Built-in — searches on every request |
| DeepSeek V4 Pro | DeepSeek | Exa (injected via gateway) |
| Kimi K3.1 Pro | Moonshot AI | Exa (injected via gateway) |
| Hermes 4 405B | Nous Research | Exa (injected via gateway) |
| Qwen 3.8 Max | Alibaba | Exa (injected via gateway) |

The lineup deliberately spans closed frontier models, open-weight models, and a
search-first model, across six countries of origin. No attempt is made to match models on
parameter count, price, or latency — the premise is that a practitioner choosing a model
cares about outcome per dollar, not architecture.

**Versions are never upgraded in place.** A new model version receives a new identity and
a fresh record, so a model's history always refers to one specific version. Records cannot
silently improve because a vendor shipped an update mid-experiment.

**Search tiers are an uncontrolled asymmetry.** Four models have native provider search;
four have none and are given Exa; one always searches. This is a real inequality in
reachable information and is not controlled for. See §12.

## 4. The daily cycle

| Phase | Timing | What happens |
|---|---|---|
| Morning | Scheduled pre-market, weekdays | One market snapshot taken. All 9 models queried **in parallel** with the identical prompt. Predictions, costs, latencies, sources, failures recorded. Consensus trade selected and opened. |
| Evening | After the close, weekdays | Official closes fetched. All of the day's predictions scored. Leaderboard and analytics recomputed. Open trade closed. |
| Weekly | Saturdays | Narrative report: day-by-day chapters, standings, notable calls. |

Models are queried **simultaneously, not sequentially**, so none can see another's answer
and none gets a later — therefore better-informed — read of the market. Day-one latencies
ranged from 12.6s to 180.6s; because queries are concurrent, the slow models do not
receive a staler or fresher market than the fast ones (the snapshot predates all of them).

**Timing is unreliable and this matters.** The morning job is scheduled pre-market, but
scheduled runs on the host platform are frequently delayed, sometimes by hours. On
2026-10-29 the run landed at 10:21 AM ET — 51 minutes *into* the session. The system is
therefore designed to be correct whether it runs pre-market or mid-session: the
information block is explicitly labelled with session state and timestamp (§5.1). Actual
run time is recorded with every day's data.

A consequence worth stating plainly: because the run time drifts, the **forecast horizon
drifts with it**. A 6:00 AM run forecasts a full session; a 10:21 AM run forecasts the
remaining 5h39m. Predictions from different days are not horizon-matched. This is an
unaddressed defect (§12).

**Idempotence.** Every stage can be re-run without duplicating or double-counting. A
single model failing does not block the others; failures are recorded per model per day.

## 5. What every model receives

Every model receives exactly four things: a time header, a market snapshot, a macro block,
and the task. Nothing else — no memory, no prior-day context, no performance feedback, no
knowledge of any other model's answer. **Every day is a cold start.**

Appendices A–C contain the verbatim prompts and a real rendered block.

### 5.1 The market snapshot

One snapshot taken from Yahoo Finance **before any model is called**; the same numbers go
to all nine. For each of 15 instruments:

- the current price, labelled live-intraday or last-close according to session state
- the **previous close**, shown beside it
- the **move so far today**, as a percentage
- the day's high–low range
- the 5-day change

| Group | Instruments |
|---|---|
| Indices / ETFs | SPY, QQQ, DIA, IWM |
| Stocks | AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META |
| Indicators | VIX, 10-year Treasury yield |
| Crypto | BTC-USD, ETH-USD |

Plus an **earnings flag** for any covered stock reporting within one day either side of
the trading date, with consensus EPS.

The block header changes with session state (pre-market / open / closed) and carries the
snapshot timestamp, so a model always knows whether it is looking at a live price or a
stale close.

**Why prices are shown in pairs.** A lone price is ambiguous. A model told only
`GOOGL: $285` cannot know whether that is a pre-news price to mark down or a post-news
price that already reflects the day's move. On 2026-10-29 GOOGL opened down 11.7% on
earnings; three of the four models that predicted it applied the drop a *second* time,
targeting ~$255 against a price that had already fallen to $285. Showing the previous close
($324.89) and the day's move (−12.3%) beside the live price removes the ambiguity. This
failure is why the pairing exists, and it is the clearest demonstration in the project so
far that how information is *labelled* changes model output as much as which information
is supplied.

**Deliberately absent:** intraday bar series, order-book or volume data, options-implied
levels, analyst targets, technical indicators, sector breadth, and news headlines as
structured data. The snapshot is a price-and-context layer only; discovering news is left
to each model's search (§5.3). Whether that division is correct is an open question (§15).

### 5.2 Macro indicators

Six Federal Reserve (FRED) series, each with its observation date: 10-year and 2-year
Treasury yields, Fed Funds rate, CPI, unemployment rate, and the 10Y–2Y spread. Identical
for all models, skipped entirely rather than partially filled if unavailable.

These are low-frequency series — CPI and unemployment are monthly, and on 2026-10-29 both
carried an as-of date seven weeks old. They provide regime context, not daily signal. The
10-year yield is deliberately duplicated between §5.1 and §5.2 from two different sources,
which can show two slightly different values with two different as-of dates.

### 5.3 Web search

Every model is instructed to research pre-market and intraday action, overnight and
breaking news, and the day's economic calendar. Retrieved sources are recorded per
prediction.

**This is the one input not held constant, because it cannot be.** Search is a capability
of the model, routed through whichever engine it has. It is the main reason two models can
reach opposite conclusions from an identical prompt — and the main reason some comparisons
are weaker than they appear.

Two asymmetries in the configuration:

- Models searching through Exa are capped at **10 results per request**, with two
  content-farm domains excluded. Models with native search get whatever their provider
  returns; **no cap is imposed on them**, and in practice they often retrieve more
  (day one: 10 and 15 results for two native models, 5 for Exa models before the cap was
  raised). No search query is supplied by us; each model forms its own.
- Because the Exa query derives from a prompt identical for every model, the four Exa
  models frequently receive the **same documents as each other**. On 2026-10-29 they
  received a byte-identical set of five URLs. See §12.

### 5.4 The task

**The framing.** Each model is told it is a market analyst in a daily AI forecasting
benchmark, that **several AI models receive the exact same prompt and are scored against
each other**, and that it should research before predicting. It is instructed to reply
with a single JSON object and nothing else.

Models therefore know they are being compared. This is disclosed deliberately — no model
is misled about the use of its answer — but competitive framing is not a neutral
instruction, and its effect is unmeasured (§12).

**Required output per prediction:**

| Field | Constraint |
|---|---|
| ticker | Yahoo Finance symbol; crypto as `SYMBOL-USD` |
| direction | `up` or `down`, measured from the snapshot price |
| target_price | expected price at the 4:00 PM ET close |
| timeframe | always `end_of_day` |
| confidence | 0.50 (coin flip) to 0.95 (very strong signal) |
| reasoning | 2–3 sentences citing specific data or news found |
| current_price_at_prediction | the price the model believes it is looking at — recorded for comparison, **never used for scoring** (§6) |

**Also required:** 3 to 5 predictions, at least one on SPY, QQQ, or DIA; plus a top-level
2–3 sentence summary of the conditions the model found, stored and published alongside
its predictions.

The scoring rules are stated in the prompt itself, including that high-confidence wrong
calls cost the most and that the model should be calibrated. Every model therefore knows
exactly how it will be judged and can calibrate deliberately. It is also told explicitly
that a move already visible in the snapshot must not be applied a second time.

**The output shape is shown as a filled-in JSON example**, which necessarily contains
concrete placeholder values — a ticker (SPY), a direction (up), a confidence (0.65). The
example prices are far from any plausible current level and cannot anchor a target, but
the possibility that it nudges ticker choice, direction, or confidence is not ruled out
(§12). It applies identically to all nine models.

**Recovering a malformed answer.** If a model returns invalid JSON, the raw text is passed
to a separate cheap model whose only instruction is to reformat it — preserving tickers,
directions, prices, confidences, and reasoning exactly, inventing nothing. This rewrites
structure, never content, and whether it ran is recorded with the prediction. Up to three
attempts are made per model; a model still producing nothing usable is recorded as having
failed that day rather than given a substitute answer.

**Normalisation applied to raw answers**, all recorded as issues on the stored record:

- tickers upper-cased, `$` prefix stripped
- confidence given as a percentage (e.g. `65`) divided by 100
- confidence clamped to [0.50, 0.95]
- predictions missing a direction, target, or confidence are **dropped**
- if more than 5 valid predictions are returned, the **first 5 are kept**
- prediction IDs are assigned by the pipeline, never by the model

## 6. The baseline, and why it is the crux

Every prediction is judged on whether price moved in the predicted direction **from a
baseline**. Which number serves as that baseline determines whether the experiment is fair
at all.

Three rules:

1. **The baseline is the snapshot price** — the identical number shown to the model in its
   prompt. The price a model reasons from and the price it is judged against are the same
   number by construction, not by coincidence.
2. **It is identical across all nine models.** Because one snapshot precedes all calls, no
   model is judged against a later or slightly different price. A volatile open cannot
   advantage whichever model happened to answer first.
3. **A model's self-reported price is never used for scoring.** Models are asked what price
   they believe they are looking at, and the answer is stored — useful evidence about
   whether a model reads its inputs correctly — but it has no effect on the score. A stale
   or hallucinated price cannot inflate a result.

If a model predicts a ticker outside the snapshot, that price is fetched **once** and
shared across all models, so even off-slate predictions share a baseline. A prediction for
which no baseline can be established is discarded rather than guessed at, since it could
never be scored fairly.

**Why this is emphasised.** An earlier version violated rules 1 and 2: the prompt showed
one number (mislabelled, from a batch fetch) while scoring used a different number (fetched
separately, per model, per ticker, after each answer arrived). Models were scored against
prices they had never seen, and nine models were scored against nine slightly different
baselines. The observed spread on day one was small (0.09% on QQQ) but it is measured
against a ±1% precision band, and on a gap-day open it would be far wider.

## 7. Scoring mathematics

Each prediction resolves against the official close. Let `C` be the close, `B` the
baseline, `T` the target, and `f` the stated confidence.

**Realised direction**

```
actual_direction = "up" if C >= B else "down"
```

A close exactly equal to the baseline counts as **up**. This is an arbitrary tie-break
and a known minor flaw.

**Target accuracy**

```
target_accuracy = 1 - |C - T| / T
```

**Score**

```
base  = +f   if direction correct
        -f   if direction wrong

bonus = +0.5 if direction correct AND target_accuracy >= 0.99
        0    otherwise

score = base + bonus
```

The `>= 0.99` threshold means the close landed within 1% of the stated target.

**Score range:** −0.95 to +1.45 per prediction.

**Design intent.** Because the penalty scales with confidence, a wrong call at 0.90 costs
0.90 while a right call at 0.55 earns 0.55. **Overconfidence is punished harder than
caution is rewarded.** The intent is to measure calibration rather than bravado: a model
claiming 0.95 on everything should lose to one that reserves high confidence for cases it
genuinely understands.

The precision bonus is deliberately small. Direction is the tradeable signal; hitting an
exact target is a secondary skill worth acknowledging but not worth dominating the score.

**Unresolved predictions** — where no closing price can be retrieved — are recorded with
status `unresolved` and score 0, not counted as wrong. Scoring is re-runnable and never
double-counts a resolved prediction.

**A known weakness in this formula:** the score is not a return. It cannot be summed into
a P&L, and a model can lead the scoreboard while losing money, because being right on
many tiny moves outscores being right on a few large ones. §8 therefore tracks returns
separately, and §13 proposes making returns primary.

## 8. The measurement layer

Points are the scoreboard but not the finding. The following are computed across all
resolved predictions. **None has yet run on real data.**

### 8.1 Per model

| Metric | Definition | Why |
|---|---|---|
| Accuracy | correct ÷ predictions | headline, but easy to get lucky at |
| **Wilson lower bound** | 95% lower confidence bound on accuracy (z = 1.96) | **primary ranking statistic**; penalises small samples so 3-for-3 does not outrank 60-for-100 |
| Brier score | mean of `(f − outcome)²` | formal calibration test: does stated confidence match observed frequency |
| Directional return % | signed move from baseline to close, positive when the call was right | the profitability measure, closest to the actual goal |
| Avg / total return % | mean and sum of the above | |
| Calibration buckets | accuracy within 50–59, 60–69, 70–79, 80–89, 90%+ | shows *where* confidence breaks down, not just that it does |
| Per-ticker and per-class accuracy | index vs. stock vs. crypto (min 3 predictions per ticker) | a model may be competent on indices and useless on single names |
| Head-to-head | pairwise records on same-day, same-ticker predictions | the only strictly fair pairwise comparison available |
| Streaks | current, best, worst | narrative, not inferential |

**Directional return**

```
move = (C - B) / B * 100
directional_return = move        if predicted up
                     -move       if predicted down
```

Note this is an **unsized, unlevered, frictionless** return: no position sizing, no
transaction costs, no slippage, no borrow cost for shorts. It is a measure of signal, not
of achievable profit.

### 8.2 Across models — the cocktail measurements

**Committees.** Every combination of 1 to 4 models is evaluated — **255 combinations**
across 9 models (9 + 36 + 84 + 126).

- A committee *signals* on a (date, ticker) when **every** member predicted that ticker in
  the **same direction**.
- The signal is *correct* when a majority of members' individual calls were correct.
- Its return is the mean of members' directional returns.
- Committees with fewer than **10 signals** are not ranked at all.
- Ranked by Wilson lower bound, then average return. Top 25 retained.

**Signal frequency is tracked alongside accuracy.** A committee that is 80% accurate but
signals twice a month is less useful than one that is 65% accurate daily.

**Herding.** The check on the independence assumption, computed over every (date, ticker)
with at least 2 models predicting:

- *herding rate* — share of overlaps where all models agreed
- *unanimous accuracy* — how often unanimous agreement was correct
- *contrarian wins* — how often, on a split, the minority direction was right

If unanimous accuracy is no better than chance, agreement carries no information and the
cocktail thesis fails. **This is the single most important diagnostic in the project** and
the one most directly threatened by the shared-source problem in §12.

### 8.3 What is deliberately not measured

- No comparison against a naive baseline (always-up, random, momentum, buy-and-hold).
  **This is a significant omission** — without it, "55% accurate" has no reference point,
  since index direction is not a 50/50 proposition over a bull period. Flagged in §15.
- No statistical test of whether a committee beats its best member. Rankings are
  descriptive only.
- No correction for multiple comparisons across the 255 committees.
- No regime segmentation (high vs low volatility, trending vs ranging).

## 9. From prediction to trade

Scoring measures accuracy. A paper simulator tests whether accuracy survives execution.

**Consensus trade selection**, daily:

1. Group all predictions by (ticker, direction).
2. Exclude broad-market and volatility instruments (DIA, VIX, IWM) and all crypto.
3. Require **≥ 4 models agreeing** for a single stock; **≥ 5** for an index ETF.
4. For each surviving group compute:

```
expected_move_pct = |avg_target - avg_entry| / avg_entry * 100
score             = avg_confidence * expected_move_pct
```

5. The highest-scoring candidate becomes the day's trade.
6. Index consensus is expressed through a **3× leveraged** instrument (SPY→SPXL,
   QQQ→TQQQ) so an index signal is measurable rather than negligible.

**This formula has no term for how many models agreed, and that is a defect, not a
simplification.** Once the ≥4 gate passes, 4-of-9 and 8-of-9 rank identically. See §12 for
the day-one consequence.

**Simulator mechanics**

| Parameter | Value |
|---|---|
| Starting balance | $25,000 |
| Concurrent positions | 1 |
| Position size | `int(balance / entry_price)` — effectively all-in |
| Entry price | the **real regular-session open (9:30 ET)** |
| Exit | the same day's official close |
| Costs modelled | none (no commission, slippage, spread, or borrow) |

Entry at the regular-session open is **deliberately pessimistic**: the fill is a price
available to anyone, after any morning gap has already occurred, so results are not
flattered by an entry no real participant could have obtained. It is also *not* the
baseline the forecast was scored against, so trade P&L and prediction score can disagree —
intentionally, because that gap is exactly the cost of acting on a signal.

All-in sizing with no risk control is a stress test, not a strategy. It will produce
violent equity swings, and on a 3× leveraged instrument it can approach ruin. See §15.

## 10. Every threshold in one place

| Threshold | Value | Where |
|---|---|---|
| Predictions required per model | 3 minimum, 5 maximum | prompt + validation |
| Index requirement | ≥1 prediction on SPY, QQQ, or DIA | prompt + validation |
| Confidence range | 0.50 – 0.95 (clamped) | prompt + normalisation |
| Precision bonus | +0.5 | scoring |
| Precision bonus band | within 1% of target (`target_accuracy ≥ 0.99`) | scoring |
| Direction tie-break | close == baseline counts as **up** | scoring |
| Retries per model | 3 | pipeline |
| Instruments in snapshot | 15 | information set |
| FRED series | 6 | information set |
| Earnings flag window | ±1 day | information set |
| Exa results per request | 10 | search config |
| Native search result cap | none imposed | search config |
| Max committee size | 4 | analytics |
| Committees evaluated | 255 | analytics |
| Min signals to rank a committee | 10 | analytics |
| Committees retained | top 25 | analytics |
| Min predictions for per-ticker stats | 3 | analytics |
| Wilson bound z | 1.96 (95%) | analytics |
| Calibration buckets | 50-59, 60-69, 70-79, 80-89, 90+ | analytics |
| Models agreeing for a stock trade | 4 | trade selection |
| Models agreeing for an index trade | 5 | trade selection |
| Excluded from trade selection | DIA, VIX, IWM, all crypto | trade selection |
| Index leverage | 3× (SPXL, TQQQ) | trade selection |
| Simulator starting balance | $25,000 | simulator |
| Concurrent positions | 1 | simulator |

## 11. Operating constraints

A reviewer proposing changes should treat these as the real envelope.

**Hard constraints**

- **One prompt for all models, always.** Per-model prompt tuning would make the experiment
  measure the tuning rather than the model. This is foundational, not incidental.
- **Models are queried concurrently** and cannot see each other's answers within a round.
- **No live capital.** All trading simulated.
- Single API gateway for all models, so the request path is identical.
- Fully automated on scheduled CI runs; no human in the loop on any trading day.
- Data stored as version-controlled flat files, no database.

**Soft constraints**

- **Cost is not a meaningful limit at current scale.** Day one cost **$0.4671** for 9
  models and 35 predictions. A second round of all 9 models would roughly double it. At
  ~21 trading days/month the project runs well under $25/month, and roughly $0.007 per
  search request. Proposals should not be shaped by token economy.
- Latency tolerance is generous: day-one responses ranged 12.6s–180.6s, and a round is
  bounded by its slowest model.
- Run time drifts by hours because scheduled jobs are delayed; nothing can depend on
  executing at a precise clock time.
- Free market data (Yahoo Finance, FRED). Paid feeds — order book, options chains, tick
  data, news APIs — are not currently used but are not ruled out.

**Explicitly open to change**

Everything in §7 (scoring formula), §9 (trade selection and sizing), the ticker universe
in §5.1, the number of rounds per day, and whether predictions are free-choice or
assigned. There is no history to preserve (see the banner at the top), so none of these
carries a migration cost today.

## 12. Known defects and limitations

Ordered by how much damage each does to the central question.

### 12.1 Prediction coverage is self-selected — the most serious structural flaw

Models choose their own tickers beyond the one required index call. On 2026-10-29:

- **GOOGL** was predicted by 4 of 9 models. Five never offered an opinion.
- Three models (Hermes, Kimi, Qwen) each predicted the **same three tickers** (SPY, QQQ,
  IWM) — the bare minimum, index requirement satisfied, nothing else.
- **IWM** was predicted by 4 models despite not being in the information set at the time.

Consequences:

1. **"Consensus" means consensus among whoever volunteered**, not among the panel. A
   4-model agreement may be 4-of-4-who-looked, which is a very different claim from
   4-of-9-asked. The denominator is invisible to the scoring and trade logic.
2. **Selection bias in individual records.** A model that predicts only when it feels
   confident will outscore one that predicts broadly, for reasons unconnected to skill.
3. **Committee statistics are computed on accidental overlap.** Two models can only be
   compared where their self-chosen tickers happened to coincide, so committee sample
   sizes are driven by ticker-choice correlation rather than by design.

§13 proposes the fix.

### 12.2 Sources are not independent, which undermines the cocktail thesis directly

On 2026-10-29 the four Exa models received a **byte-identical** set of five source URLs —
not merely overlapping, identical. Their predictions showed the signature: three picked the
same three tickers in the same three directions with targets within 0.3% of each other.

If models share an information diet, their agreement is not independent evidence, and the
herding diagnostic (§8.2) will report high unanimous accuracy that reflects a shared source
rather than converging judgement. **This is the most direct threat to the project's central
hypothesis**, and the current design neither controls for nor adjusts for it.

### 12.3 The consensus trade rewards magnitude over agreement

`score = avg_confidence × expected_move_pct` has no breadth term. Day one:

| Ticker / direction | Models agreeing | Avg conf | Expected move | Score | Selected |
|---|---|---|---|---|---|
| GOOGL down | **4** | 0.802 | 8.15% | **6.537** | ✅ |
| NVDA down | 1 | 0.650 | 4.00% | 2.600 | — |
| MSFT up | 3 | 0.683 | 3.24% | 2.215 | — |
| **QQQ down** | **8** | 0.693 | 1.01% | 0.696 | — |
| SPY down | **8** | 0.630 | 0.43% | 0.271 | — |

The trade went to the ticker with **half the agreement** of the runner-up, beating it by
9.4×, because expected move dominates the product. Worse, that 8.15% expected move was
itself an artefact of the mislabelling bug described in §5.1 — three models had
double-counted a drop that had already happened. **A data error manufactured the trade.**

Expected move is the least reliable quantity a model produces, and it is currently the
dominant term in trade selection.

### 12.4 The forecast horizon is not constant

Because run time drifts by hours (§4), a prediction may cover a full session or only part
of one. Predictions across days are not horizon-matched, which inflates variance and makes
cross-day comparison inexact. Nothing currently normalises for this.

### 12.5 No benchmark to beat

Nothing is compared against a naive strategy — always-up, random, momentum, or
buy-and-hold. Without a reference, "55% directional accuracy" is uninterpretable, because
index direction is not a 50/50 proposition over a trending period. A model could look
skilful purely by being structurally long in a rising market.

### 12.6 Statistical fragility

- **Zero resolved predictions today.** Every number in §8 is currently undefined.
- Same-day close prediction is near-coin-flip; dozens of days cannot separate skill from
  luck. The Wilson bound and 10-signal floor mitigate but do not manufacture information.
- **255 committees evaluated** with no multiple-comparisons correction. Some will look
  excellent by chance. A top-ranked committee is a hypothesis, not a finding, until it
  survives out-of-sample.
- Committees are ranked on the same data used to discover them. There is no holdout.

### 12.7 Scoring does not measure money

The §7 score is not a return and cannot be summed into P&L. A model can top the leaderboard
while losing money. Returns are tracked separately but are unsized, unlevered, and
frictionless.

### 12.8 Model-side confounds

- **Models know they are being benchmarked.** The prompt says several AI models receive it
  and are scored against each other. Competitive framing is not neutral; a model told it is
  competing may take more or less risk than one simply asked for its best estimate. The
  effect is unmeasured. Because the framing is identical for all nine, it cannot explain
  differences *between* models — only a shift in all of them.
- **The output example contains concrete values** (SPY, up, 0.65). Prices cannot anchor, but
  ticker, direction, and confidence nudging is not ruled out. Applies equally to all nine.
- **Training-data contamination.** A model whose training data extends into the predicted
  period could appear prescient without forecasting.
- **Reliability varies.** Some models return malformed or incomplete answers and drop
  predictions. Failures are recorded, not hidden, but a model with more failures has a
  thinner, noisier record. Day one: all 9 succeeded, but one model's dropped predictions
  were observed in later testing.
- **Two models reported zero sources** despite having native search and producing reasoning
  that clearly reflected current news. Their retrieved sources are almost certainly not
  being captured rather than absent — so source-level auditing is incomplete for 2 of 9.

### 12.9 Information-set gaps

- No intraday series, volume, order book, options-implied levels, analyst targets,
  technical indicators, or sector breadth.
- Macro series are weeks stale by construction (monthly releases).
- The 10-year yield appears twice from two sources with two as-of dates.
- Until day one, IWM was predictable but not supplied; the universe is maintained by hand
  and can drift out of step with what models actually predict.

## 13. Open design questions

Current form answers "who forecasts well on whatever they chose to forecast." It does not
yet cleanly answer §1. **None of the following is implemented.**

### 13.1 Rank consensus trades by breadth, not magnitude

Rank primarily by how many models agree and how confident they are; demote expected move to
a tiebreaker or minimum threshold. Add a penalty when models agree on direction but
disagree on magnitude — currently that disagreement *raises* a candidate's score. Require a
quorum so no trade is taken on a ticker most of the panel was never asked about.

Under breadth-first ranking, day one would have selected QQQ down (8 models) over GOOGL
down (4 models).

*Cheapest change, no API cost, fixes an actively harmful behaviour.*

### 13.2 A shared mandatory slate

Every model predicts the **same five tickers** daily, chosen by rule **before any model is
called** — index anchors plus the day's genuine focus names, identified by earnings in the
window and largest overnight moves. Free picks continue on top, scored separately.

This closes 12.1 entirely: every model's record becomes directly comparable on an identical
opportunity set, the self-selection advantage disappears, and committee sample sizes become
a design parameter rather than an accident.

**An alternative was considered and rejected:** letting one model choose the daily slate,
rotating the chooser. Rejected because the chooser's own record stops being comparable to
its other days; each day's slate carries different difficulty, so between-slate variance
contaminates every model's record; and selection skill becomes entangled with forecasting
skill — the opposite of holding information constant. A middle option — all nine nominate,
top nominations become the slate — avoids single-chooser variance but still makes the slate
endogenous to the thing being measured. **Rule-based selection keeps the slate exogenous.**

*Mechanical note: the 5-prediction cap must rise to ~8 to fit a mandatory slate plus free picks.*

### 13.3 A solicited second round

When round 1 surfaces a strong candidate that was not on the slate, poll the models that
did **not** cover it. Consensus then has a real denominator: 7-of-9 rather than 4-of-4.

**Critical design constraint:** the second-round prompt must **not** reveal that other
models already picked it. Disclosing the consensus converts independent agreement into
herding, destroying the one property the cocktail thesis depends on.

Round-2 answers are also not comparable to round-1 answers — asked later, with more of the
session elapsed and more information available. They should feed consensus and trade
selection but probably never the individual leaderboard. That boundary is a judgement call.

### 13.4 Two scoreboards instead of one

With a mandatory slate, forecasting and selection separate cleanly:

| Board | Question | Basis |
|---|---|---|
| **Forecasting** | Given identical information, who is most accurate and profitable? | the shared slate |
| **Selection** | Who finds the best opportunities unprompted? | each model's free picks |

A model could be a strong picker and a weak forecaster, or the reverse — a distinction the
current single leaderboard cannot express.

### 13.5 One paper portfolio per model

A fixed slate enables the most direct possible answer to §1: **nine equity curves**, each
model trading its own calls on identical tickers at identical entry prices, sized by its
own stated confidence, with the consensus strategy as a tenth curve and a naive baseline as
an eleventh.

This would show drawdowns, hit rate, and — critically — whether a model's stated confidence
is actually informative about position size. Points cannot show any of that. It requires
replacing all-in single-position sizing with something defensible.

## 14. What would count as a result

The experiment succeeds if, after enough days, it can state with reasonable confidence:

- whether any individual model beats a **naive baseline** on same-day direction, after
  accounting for small-sample luck;
- whether any specific **combination** of models beats its best individual member — the
  cocktail question — and whether that survives out-of-sample;
- whether model-stated **confidence carries real information**, and can therefore be
  trusted to size a position;
- whether any of the above **survives execution** at honest prices, as a paper equity curve
  net of realistic costs.

**A credible negative result is a legitimate and useful outcome** — that none of these
models forecasts same-day moves better than a naive strategy, and that agreement between
them adds nothing. The measurement layer is built to detect failure, not to flatter the
models, and the project should be willing to publish that conclusion.

## 15. Questions for a reviewer

Where outside perspective would be most valuable:

1. **Is same-day close the right horizon at all?** It is close to a coin flip and demands
   enormous samples. Would multi-day, weekly, or volatility/range forecasting extract more
   signal per observation from the same models?
2. **How should source correlation (12.2) be handled?** Options: force engine diversity and
   accept engine as a confound; standardise all nine on one engine and accept that search
   quality is then uniform but artificial; supply a shared news corpus and remove model
   search entirely; or measure the correlation and discount committees accordingly. Each
   trades a different thing away.
3. **What is the right naive baseline** (12.5)? Always-long, random, prior-day momentum,
   buy-and-hold SPY — or several?
4. **How should 255 committees be evaluated without over-fitting?** Holdout, walk-forward,
   a false-discovery-rate correction, or restricting the search space a priori?
5. **Is the scoring formula worth keeping?** Would ranking directly on risk-adjusted return
   be strictly better than a confidence-weighted point system that cannot be summed into P&L?
6. **How should position size relate to stated confidence?** All-in is indefensible; Kelly
   assumes calibration we have not yet established.
7. **Is the division of labour right** — a deterministic price/context layer plus
   model-driven news discovery? Or should the information set include structured news,
   options-implied levels, or technicals?
8. **Does the benchmark framing (12.8) need removing** to get unprimed estimates, and is
   there a disclosure-honest way to do that?
9. **Is anything in §13 the wrong fix** — or is there a better design not considered here?
10. **Is the drifting horizon (12.4) worth engineering around**, or should predictions simply
    be normalised by remaining session time at scoring?

---

## Appendix A — the verbatim system prompt

```text
You are a market analyst taking part in a daily AI forecasting benchmark.
Several AI models receive this exact prompt and are scored on how accurately they predict same-day price moves.
Use your web search to research current conditions before you predict.
Respond with ONLY a single valid JSON object: no markdown fences, no commentary.
```

## Appendix B — the verbatim user prompt template

`{{NOW_ET}}`, `{{DATE}}`, and `{{MARKET_CONTEXT}}` are substituted at run time.
`{{MARKET_CONTEXT}}` receives the §5.1 snapshot followed by the §5.2 macro block.

```text
Current time: {{NOW_ET}} (US Eastern). Trading date: {{DATE}}.
Regular session: 9:30 AM to 4:00 PM ET.

{{MARKET_CONTEXT}}

TASK
Research pre-market or intraday action, overnight and breaking news, and today's
economic calendar. Then make 3-5 specific, falsifiable predictions about where
prices will be at today's 4:00 PM ET close. If news you find describes a move that
the MARKET DATA block already shows as having happened today, predict what happens
from here — do not apply that move a second time.

RULES
1. At least one prediction must be on SPY, QQQ, or DIA.
2. Tickers must be Yahoo Finance symbols: US-listed stocks/ETFs, or crypto as SYMBOL-USD (e.g. BTC-USD).
3. direction: "up" or "down", measured from the price shown in the MARKET DATA block
   above. That snapshot is the scoring baseline, it is identical for every model, and
   it already includes any move that has happened so far today. For a ticker not
   listed above, the live Yahoo price when your answer arrives is used instead.
4. target_price: the price you expect at today's close.
5. timeframe: always "end_of_day".
6. confidence: 0.50 (coin flip) to 0.95 (very strong signal).
7. reasoning: 2-3 sentences citing specific data or news you found.

SCORING
- Direction correct: +confidence. Direction wrong: -confidence.
- Bonus: +0.5 when the direction is correct and the close is within 1% of your target.
High-confidence wrong calls cost the most. Be calibrated.

Return ONLY this JSON:
{
  "market_context": "2-3 sentence summary of the conditions you found",
  "predictions": [
    {
      "ticker": "SPY",
      "direction": "up",
      "target_price": 600.00,
      "current_price_at_prediction": 598.00,
      "timeframe": "end_of_day",
      "confidence": 0.65,
      "reasoning": "2-3 sentences citing specific data"
    }
  ]
}
```

## Appendix C — a real rendered information block

The actual `{{MARKET_CONTEXT}}` substituted on 2026-10-29, mid-session.

```text
=== MARKET DATA (Yahoo Finance live snapshot, 12:58 ET — market OPEN) ===

The first price on each line is the LIVE intraday price at the moment of this
snapshot, NOT a previous close. The previous close is given separately so you can
see how far today has already moved. Any gap or news-driven drop earlier today is
ALREADY reflected in the live price — do not subtract it again.

INDICES / ETFs:
  SPY: $769.29  |  prev close $772.31  |  -0.39% today  |  day range $767.27-$770.76  |  5-day +0.7%
  QQQ: $715.71  |  prev close $725.61  |  -1.36% today  |  day range $711.62-$718.07  |  5-day +1.6%
  DIA: $522.36  |  prev close $524.68  |  -0.44% today  |  day range $521.32-$523.46  |  5-day -1.1%
  IWM: $284.40  |  prev close $281.29  |  +1.11% today  |  day range $282.15-$285.26  |  5-day +2.8%

KEY STOCKS:
  AAPL: $349.77  |  prev close $343.83  |  +1.73% today  |  day range $347.30-$351.43  |  5-day +0.5%
  MSFT: $524.68  |  prev close $531.01  |  -1.19% today  |  day range $519.56-$540.97  |  5-day +0.7%
  NVDA: $213.57  |  prev close $215.38  |  -0.84% today  |  day range $212.08-$215.32  |  5-day +0.6%
  TSLA: $404.86  |  prev close $404.22  |  +0.16% today  |  day range $400.50-$406.98  |  5-day +8.1%
  AMZN: $246.35  |  prev close $254.60  |  -3.24% today  |  day range $241.24-$249.14  |  5-day -1.6%
  GOOGL: $284.55  |  prev close $324.89  |  -12.42% today  |  day range $280.36-$288.33  |  5-day -12.2%
  META: $634.43  |  prev close $612.49  |  +3.58% today  |  day range $616.80-$634.63  |  5-day -2.2%

CRYPTO (24h market):
  BTC-USD: $81,097.61  |  prev close $81,267.59  |  -0.21% today  |  day range $79,614.36-$81,771.26  |  5-day +0.4%
  ETH-USD: $2,350.01  |  prev close $2,357.62  |  -0.32% today  |  day range $2,294.88-$2,371.85  |  5-day -0.2%

MARKET INDICATORS:
  VIX: 16.29  (-3.67% today)
  10Y Treasury Yield: 4.99%

EARNINGS IN THIS WINDOW:
  AMZN: reports today (2026-10-29), consensus EPS $1.99
  GOOGL: reported yesterday (2026-10-28), consensus EPS $3.33

These live prices are the baseline your direction is scored against. Predict where each ticker closes at 4:00 PM ET relative to the live price above.
===

MACRO ECONOMIC INDICATORS (from Federal Reserve / FRED):
  10-Year Treasury Yield: 4.99 (as of 2026-10-27)
  2-Year Treasury Yield: 4.7 (as of 2026-10-27)
  Fed Funds Rate: 3.75 (as of 2026-09-01)
  CPI (Consumer Price Index): 336.298 (as of 2026-09-01)
  Unemployment Rate: 4.2 (as of 2026-09-01)
  10Y-2Y Yield Spread: 0.38 (as of 2026-10-28)
```

## Appendix D — the stored record of a prediction

Each prediction is stored with the fields below. Those marked **model** come from the
model; the rest are assigned by the pipeline.

| Field | Source | Note |
|---|---|---|
| id | pipeline | assigned, never model-supplied |
| ticker, direction, target_price, timeframe, confidence, reasoning | **model** | normalised per §5.4 |
| model_reported_price | **model** | what the model believed the price was; never scored |
| current_price_at_prediction | pipeline | the scoring baseline (§6) |
| prev_close | pipeline | previous close for the same ticker |
| price_source | pipeline | `shared_snapshot`, `yfinance_live`, or `model_reported` |
| price_fetched_at | pipeline | timestamp of the snapshot or fetch |

Recorded per model per day: provider, search engine used, retrieved source URLs, whether
the JSON repair pass ran, latency, prompt and completion tokens, cost, finish timestamp,
and any normalisation issues. Recorded per day: the full snapshot and the exact rendered
information block, so any past day can be reconstructed precisely as the models saw it.

At scoring time each prediction gains: actual_close, actual_direction, direction_correct,
target_accuracy, score, and status (`resolved` / `unresolved`).

## Appendix E — day-one observed behaviour

2026-10-29, the first and only day of data. Run at 10:21 AM ET. All 9 models succeeded;
35 predictions stored; total cost $0.4671.

| Model | Predictions | Search | Sources | Cost | Latency |
|---|---|---|---|---|---|
| Claude Sonnet 5.5 | 4 | native | **0** | $0.0833 | 12.6s |
| GPT-5.6 Terra | 4 | native | **0** | $0.0993 | 32.8s |
| Gemini 3.8 Flash | 4 | native | 10 | $0.0941 | 27.7s |
| Grok 4.3 | 4 | native | 15 | $0.0362 | 17.6s |
| Perplexity Sonar Pro | 5 | built-in | 15 | $0.0179 | 14.6s |
| DeepSeek V4 Pro | 5 | exa | 5 | $0.0152 | 35.3s |
| Kimi K3.1 Pro | 3 | exa | 5 | $0.0487 | 107.5s |
| Hermes 4 405B | 3 | exa | 5 | $0.0121 | 14.2s |
| Qwen 3.8 Max | 3 | exa | 5 | $0.0604 | 180.6s |

Tickers predicted: SPY (9), QQQ (9), GOOGL (4), IWM (4), MSFT (3), DIA (2), BTC-USD (2),
NVDA (1), AMZN (1). The four Exa models received an identical 5-URL source set. Two native
models reported zero sources.

None of these predictions had resolved at the time of writing.

---

*This is a personal research experiment. Nothing in it is financial advice. All trading is
simulated and no capital is at risk.*
