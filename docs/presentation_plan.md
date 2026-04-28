# Presentation Plan — Oracle Trade Sales Pitch

**Purpose:** Blueprint for a presentation that doubles as (a) an investor pitch and (b) a subscriber sales pitch — at the same time, in the same room. The audience is split, so the deck has to make both groups lean in without diluting either.

**Working title:** *Oracle Trade — Five Advisor LLMs. One Consensus Trade. 83% Hit Rate.*

**Voice rule (lifted from `docs/marketing.md` §10):** confident, technical-but-not-jargon-heavy, institutional. Every claim anchors to a number. No "revolutionary," no "disrupt," no rocket emojis. Use **"Advisor LLM"** every time you'd otherwise say "AI model" — small upgrade, big compounding effect.

---

## 1. Audience analysis — what each side wants to hear

The investors and the subscribers in the room are not the same person, and they are not asking the same question. The pitch only works if every slide has *something* for both.

| | **Investors** | **Prospective Subscribers** |
|---|---|---|
| **What they're listening for** | Moat, traction, unit economics, scaling story, defensibility | "Will this make me money? Can I trust it? How easy is it to use?" |
| **What scares them** | Single-product company, no moat, regulatory risk, model commoditization | Hype, hidden fees, lockups, opacity, "another AI grift" |
| **What persuades them** | Receipts (the leaderboard), brokerage moat, calibration chart, recurring-revenue math | Live trade history, brokerage names they recognize, transparent scoring, low pricing |
| **The killer slide for them** | Slide 9 (Moat Stack) + Slide 11 (Unit Economics) | Slide 4 (How It Works) + Slide 7 (Hit Rate Receipt) |
| **What converts them** | "60-day audit log + 6 brokerage integrations + 83%" | "$100/mo on small accounts or 5% of returns on $25K+ accounts, cancel anytime, your money never leaves your brokerage" |

**The bridge:** both groups respond to the same core artifact — the publicly audited track record. Investors see it as *moat*; subscribers see it as *trust*. The deck leans on this dual-purpose asset hard.

---

## 2. Format & framing decisions

**Length options — pick by venue:**
- **5-min** — Slides 1, 2, 4, 7, 12. Live demo replaces slides 4 and 7 if a screen is available.
- **10-min** — Slides 1–4, 6–9, 12, 14, 15.
- **15-min** — Full deck (15 slides + ≤ 3 backup slides).
- **30-min with Q&A** — Full deck + 5-min live demo between slides 4 and 5 + 10-min rehearsed Q&A.

**Default to 15-min** for the class/mixed-room version. Build it first; cut for shorter slots.

**Slide design rules:**
- Dark background (#0A0A0A), Geist font, accent color per Advisor (Claude orange, Perplexity teal, Gemini blue, GPT-4o green, Grok silver).
- One headline number per slide, big. Body copy in 28pt+. No slide >25 words.
- Real screenshots from the live site (`/`, `/dashboard`, `/leaderboard`, `/analytics`, `/simulator`). Screenshots > stock images.
- Every chart pulled from `data/analytics.json` or `data/leaderboard.json` — never fabricated.

**Speaker rule:** Memorize the one-sentence pitch (`marketing.md` §11) and the 60-second elevator (§9). Open with one of them. If the projector dies, you can deliver the whole pitch verbally and still close.

---

## 3. The pitch arc

A standard arc that works for both audiences:

```
HOOK  →  PROBLEM  →  PRODUCT  →  PROOF  →  MOAT  →  BUSINESS  →  ASK
```

The two audiences require slightly different emphasis at PROOF, MOAT, and BUSINESS, but the same arc works for both. We thread investor-relevant detail and subscriber-relevant detail into the same slides — labeled in §4 as **[I]** for investor-focused and **[S]** for subscriber-focused.

---

## 4. Slide-by-slide outline (15 slides)

### Slide 1 — Title / Hook
- **Visual:** Oracle Trade wordmark, dark hero. Eyebrow pill "Live · 4-of-5 Advisor consensus."
- **Headline:** *Five Advisor LLMs. One Consensus Trade. 83% Hit Rate.*
- **Subhead:** *60 days live. 525 predictions scored. Publicly audited.*
- **Speaker delivers:** the one-sentence pitch from `marketing.md` §11. Verbatim. Smooth. No hedges.
- **[Both]** Anchors three credibility numbers in the first 15 seconds.

### Slide 2 — The Problem
- **Three-line stack:**
  1. Retail investors underperform the S&P 500. Discipline gap.
  2. "AI trading" is a marketing word, not an audit log.
  3. One LLM has one bias. Five LLMs disagree productively.
- **Visual:** Three-circle Venn from the report (Figure 1). The intersection is labeled "Oracle Trade."
- **[I]** Frames a *category* problem — not a feature gap. Investors fund category creators.
- **[S]** Names the user's frustration ("everyone says AI but no one shows their work").

### Slide 3 — The Insight
- **Headline:** *No single model is enough. Five disagreeing models are.*
- **Body:** When Claude, GPT-4o, Gemini, Perplexity, and Grok independently land on the same call, that agreement *means* something — because their training data, alignment, and failure modes are uncorrelated.
- **Visual:** Five model logos in a circle, with arrows converging on a single trade ticket.
- **[Both]** Sets up why "consensus" is the load-bearing word, not "AI."

### Slide 4 — How It Works (the demo slide)
- **Headline:** *Every weekday, before the open.*
- **Pipeline diagram (lifted from `marketing.md` §9):**
  ```
  Pre-market data (yfinance + FRED + Finnhub + CoinGecko + EIA + CFTC COT)
       ↓
  Five Advisor LLMs (Claude · GPT-4o · Gemini · Perplexity · Grok)
       ↓
  Research brief (published in PROMPT.md)
       ↓
  4-of-5 consensus filter
       ↓
  Brokerage execution (Robinhood · Schwab · Fidelity · Webull · E*TRADE · IB)
       ↓
  Public scoring (leaderboard · analytics · simulator)
  ```
- **Speaker move:** Tap each box. When you hit "Research brief," point to `PROMPT.md` in the repo: *"That's the actual prompt every Advisor receives. Read it tonight if you want. The work isn't in keeping it secret. It's in the months of iteration and the sixty days of receipts behind it."* Transparency reads as confidence.
- **[I]** Architectural clarity = investible.
- **[S]** Names six brokerages they already trust.

### Slide 5 — A Day in the Life (subscriber-leaning)
- **Visual:** Three phone-frame screenshots side by side: 8:30 AM signal alert · 9:30 AM trade executed · 4:00 PM result scored.
- **Headline:** *Wake up. Get a signal. The trade fires automatically. By close, you can audit it.*
- **Caption:** No charts to read. No watchlists to maintain. No "should I or shouldn't I."
- **[S]** This is the slide that converts subscribers. Show it.
- **[I]** Demonstrates UX maturity — investors care that the consumer surface exists.

### Slide 6 — The Track Record (the receipt slide)
- **Visual:** Live screenshot of `/leaderboard` — five Advisors ranked by total score. Don't hide the spread. The fact that GPT-4o leads at +53 and Perplexity sits at +3 is *evidence the panel does real work.*
- **Headline:** *Every call. On the record. Forever.*
- **Speaker line:** *"We score every individual prediction. We score every executed trade. We publish both. Most platforms ask you to trust them — we ask you to check our work."*
- **[Both]** This is the load-bearing slide. Linger here.

### Slide 7 — The Headline Number
- **Visual:** One number, full-bleed: **83%**
- **Subhead:** *Direction-correct on consensus trades. 5 of 6 closed. 60 days live.*
- **Caveat (small text, on slide):** "Sample size will grow. We update this number live, every trade, in `simulator.json`."
- **Speaker rule:** Acknowledge sample size *before* anyone asks. Per `marketing.md` §5: refusing to acknowledge small *n* looks evasive; acknowledging it looks sharp.
- **[I]** The single most important slide for investors. Memorize the phrasing.
- **[S]** The single most important slide for subscribers. Same.

### Slide 8 — Calibration (the institutional-grade flex)
- **Visual:** Calibration chart from `data/analytics.json`. X-axis stated confidence, Y-axis realized hit rate, dashed 45° reference line.
- **Headline:** *When the panel says 70% confidence, they're right 70% of the time.*
- **Body:** Calibration is the difference between a forecast and a guess. Almost no retail platform publishes this. It's the single chart most likely to make a sophisticated investor lean forward.
- **[I]** This slide separates Oracle Trade from "AI hype" platforms.
- **[S]** Plain-English caption ensures non-quants get it: *"In other words: when we say we're confident, we mean it.")*

### Slide 9 — The Moat Stack (investor-leaning, but visible to all)
- **Headline:** *You could build this in a weekend. You couldn't replicate it.*
- **Four-row stack:**
  1. **The Receipts** — 60 days, 525 predictions, 83% on consensus. Trust compounds daily.
  2. **The Research Brief.** Months of iteration on how to get five different model APIs to produce comparable, calibrated, parseable output. Published in the repo. Reading the prompt does not replicate the iteration that built it.
  3. **Brokerage Integrations** — six live broker connections. Months-of-work-per-broker compliance moat.
  4. **Operational Discipline** — unattended every weekday. Zero missed runs. Boring but defensible.
- **Speaker close:** *"A competitor starting today can copy the architecture in a week. They cannot replicate the receipts."*
- **[I]** This is the slide investors photograph.
- **[S]** Reads as "this is a serious, durable product, not a side project."

### Slide 10 — The Market
- **Headline:** *82M US retail brokerage accounts. $0 spent on systematic-discipline tools they can actually use.*
- **Body:**
  - Robinhood, Schwab, Fidelity, Webull, E*TRADE, Interactive Brokers — combined, ~80M+ funded retail accounts.
  - Existing systematic alternatives are RIA-gated, $50k+ minimums, or quantitative funds with 2-and-20 fee structures.
  - The wedge: bring quant-style discipline to anyone with $500 in a brokerage app.
- **Visual:** Bar chart — retail account count vs. systematic-trading product penetration.
- **[I]** TAM signal. Investors need a number here.
- **[S]** Signals "we know who we serve."

### Slide 11 — The Business Model
- **Visual:** Three pricing cards.

| **Free** | **Pro** | **Institutional — $499/mo** |
|---|---|---|
| Leaderboard, daily signals, full audit log | Auto-execution via your brokerage, alerts, weekly reports | API access, custom advisor configs, white-label |
| For learners and skeptics | $100/mo on accounts under $25K, or 5% of returns on accounts $25K+ | For RIAs and small funds |

- **Pricing rationale (deliver verbally):** *"We charge a flat $100/mo for smaller accounts where flat fees are predictable, and switch to 5% of returns once an account clears $25K. The performance fee aligns our incentive with the customer's: if we don't make them money, we don't get paid."*
- **Unit economics line (under the cards):**
  *Variable cost per Pro user: ~$1.20/mo (LLM API + brokerage data). Gross margins north of 90% on either pricing model.*
- **[I]** The dual-rail Pro pricing is investor catnip: predictable revenue from the small-account flat tier, asymmetric upside from the performance tier on larger accounts. Aligned-incentive model with no asset cap.
- **[S]** Small accounts get a known cost. Large accounts pay nothing if returns are flat or negative. Both groups understand exactly what they're buying.

### Slide 12 — Why This Wins
- **Headline:** *Why now, why us, why this shape.*
- **Three columns:**
  - **Why now.** Frontier LLMs only crossed the calibrated-instruction-following bar in the last 12 months. Earlier was too soon. Later, this shape is obvious.
  - **Why us.** Sixty days of receipts. Working brokerage integrations. The research-brief IP. We're already past the proof-of-concept stage every weekend-project competitor is still in.
  - **Why this shape.** Single-vendor labs (Anthropic, OpenAI) won't build a multi-model panel — it dilutes their own brand. Funds won't publish their methods. We're in a structural gap neither side will close.
- **[I]** This slide is the "defensibility against incumbents" answer.
- **[S]** Reads as "this is well-thought-out."

### Slide 13 — Risks (preempt them — credibility unlock)
- **Headline:** *What could go wrong. (We've thought about it.)*
- **Three rows, each with a one-line answer:**
  - **Advisor correlation.** Mitigated by deliberately heterogeneous panel + head-to-head matrix shows independence empirically.
  - **Model deprecation.** Pipeline tolerates one Advisor failing; we re-tune the threshold if a model is retired.
  - **Regulatory surface.** Signals platform + user-controlled brokerage execution. We don't take custody. We are not a registered advisor.
- **Speaker move:** Per `marketing.md` §9 — having a rehearsed self-critique is the single biggest credibility signal in any pitch. Don't skip this slide.
- **[I]** Investors test for risk awareness. This slide answers it before they ask.
- **[S]** Builds trust with sophisticated subscribers.

### Slide 14 — Roadmap
- **Visual:** Quarterly bar chart, three quarters out.
- **Q1 (now):** Stable shared watchlist · 50+ closed consensus trades · Pro launch
- **Q2:** Options consensus · sector-specific advisor panels · institutional API
- **Q3:** White-label for RIAs · larger panel (7-of-9 models) · backtesting tooling
- **[I]** Investors want a forward story. Give it.
- **[S]** Signals continued investment in the product.

### Slide 15 — The Ask / Close
- **Two-column close, depending on audience:**

  | **For investors** | **For subscribers** |
  |---|---|
  | $[X] seed round · 18-month runway · path to $1M ARR by Q4 · open for intros and follow-on conversations | Free tier live today · Pro at $100/mo (under $25K) or 5% of returns ($25K+) · cancel anytime · join the waitlist at oracle.trade |

- **Speaker line (memorize):** *"You can fund us, you can subscribe, you can short us — all I'm asking is that you check our work. Every call, scored, on the record, forever."*
- **Final stat strip across the bottom:** *525 predictions · 60 trading days · 83% consensus correctness · +9% paper return.*

---

## 5. Live demo plan (insert between slides 4 and 5 if time allows)

**Total: 90 seconds. Rehearse it five times before show day.**

1. **0:00–0:20** — Open the live landing page. Read the hero out loud. *"Five Advisor LLMs. One consensus trade. 83% hit rate."* Point at the live ticker strip.
2. **0:20–0:50** — Click to `/dashboard`. Show today's predictions. Point at one consensus call. Read the advisor chips that aligned. Read the target price + confidence.
3. **0:50–1:15** — Click to `/leaderboard`. Scroll the rankings. *"Notice they don't all agree. That's why consensus matters."*
4. **1:15–1:30** — Click to `/analytics`. Stop on the calibration chart. *"When we say 70% confidence, we should be right 70%. Look how close the line tracks."*

**Backup:** if WiFi dies, have screen-recordings of all four screens cued up on the laptop. Practice transitioning to backup video without stopping the spoken track. The pitch must work without internet.

---

## 6. The Q&A Bank — rehearse aloud until automatic

Lifted and lightly adapted from `marketing.md` §6. Each answer ≤ 30 seconds. The seven below cover ~95% of questions you'll get.

**Q: "So you just ask five chatbots and take the majority vote?"**
A: *"That's the simplest framing, and it misses the work. The Advisor LLMs receive a carefully constructed research brief that standardizes inputs, enforces output structure, and calibrates for confidence bias. Every morning they read a six-source pre-market block: yfinance prices and volatility, FRED macro indicators, Finnhub earnings and economic calendars, CoinGecko crypto state and Fear & Greed, EIA energy inventories, and CFTC commitment-of-traders positioning. Same data set an institutional desk reads before the open. The panel is the headline; the infrastructure underneath is where the engineering is."*

**Q: "Isn't the prompt the real product?"**
A: *"It's published. The prompt without 60 days of live signals, without brokerage integration, without scoring, is just a paragraph in a text file. The system is the product, and the system runs."*

**Q: "What's your edge when LLMs commoditize?"**
A: *"Commoditization helps us. Cheaper inference means we expand the panel, run more often, scale to more users at lower cost. The defensible layer was never the models. It's the aggregation, the published methodology, and the trust we build by showing our work."*

**Q: "What if a model lab shuts off their API?"**
A: *"Graceful degradation by design. Lose one advisor and we drop to 4-of-4, which we re-evaluate. The system isn't single-model-dependent."*

**Q: "Five wins out of six — that's a tiny sample."**
A: *"It is. We disclose it. Every consensus trade compounds the dataset. We update the headline number live as it grows. If it drops to 75% across 20 trades, that's still institutional-grade. If it drops to 55%, we'll say so — credibility from disclosure outweighs any flattering number."*

**Q: "Regulation?"**
A: *"Signals platform plus brokerage integration. Pro users opt into automated execution through their own brokerage accounts. We publish every call. We don't take custody of funds. Not a registered advisor — careful about that surface from day one."*

**Q (subscriber-flavored): "What does this cost me when the market moves against me?"**
A: *"Pro pricing is $100/month on accounts under $25K, or 5% of returns on accounts $25K and up. We don't take a cut of trades, we don't have a payment-for-order-flow kickback, and we don't take custody. The brokerage relationship is between you and your broker. We're a signals layer."*

---

## 7. Speaker prep checklist

**Before show day:**
- [ ] Memorize the one-sentence pitch from `marketing.md` §11 verbatim.
- [ ] Memorize the 60-second elevator from `marketing.md` §9.
- [ ] Rehearse the demo five times against a stopwatch (target: 90 seconds).
- [ ] Run through Slides 7, 9, 11 cold three times — these are the most-photographed slides; speak them without reading.
- [ ] Know the current rolling number for "consensus correctness" (pull from `data/simulator.json` the morning of). If 83% has shifted, update the deck.
- [ ] Confirm Gemini is live in the leaderboard before claiming "five operational advisors." If not, soften the language.
- [ ] Have backup screen-recordings cued for the live demo.

**Day-of:**
- [ ] Charge laptop. Bring HDMI + USB-C adapter.
- [ ] Test display 30 minutes before. Fonts and dark backgrounds are the most likely thing to render wrong on borrowed projectors.
- [ ] Water bottle on the lectern.
- [ ] Phone in airplane mode.

---

## 8. The 80/20 — if you only do five things

1. **Open with the one-sentence pitch.** Verbatim. Every time.
2. **Linger on Slide 7 (the 83%).** It's the slide that converts both audiences. Don't rush past it.
3. **Show the live calibration chart (Slide 8).** It's the chart that separates Oracle Trade from every "AI trading" pitch the room has ever seen.
4. **When asked about the prompt, say: *"That's the part I'm protecting — happy to discuss the architecture, the aggregation rule, the scoring math, or the track record."*** This is the most credibility-positive line in the entire pitch.
5. **Close with the receipts, not the ask.** *"Every call. On the record. Forever."* Then state the ask. The ask lands harder when the receipts come first.

---

## 9. What stays off the slides

The methodology is fully public, so nothing technical needs to stay off. Two operational guardrails remain:

- **Never as a bragging point:** specific dollar P&L on individual trades. Use percentages and hit rates only. Dollar P&L claims invite SEC-flavored scrutiny.
- **Never on a slide:** real customer PII, API credentials, or brokerage account specifics. Standard hygiene, not IP.

---

## 10. Visual asset checklist (build before drafting slides)

| Asset | Source | Use on slide |
|---|---|---|
| Oracle Trade wordmark (dark) | `src/assets/` or design file | 1, 15 |
| 3-circle Venn (gaps diagram) | New — build in Figma | 2 |
| 5-logo consensus circle | New — model logos | 3 |
| Pipeline diagram (7 boxes) | `marketing.md` §9, render in Figma | 4 |
| Phone-frame mockups (3) | Screenshot the live mobile views | 5 |
| `/leaderboard` screenshot | Screenshot of live page | 6 |
| Big "83%" lockup | Typography only | 7 |
| Calibration chart | Render from `data/analytics.json` | 8 |
| Moat-stack icons (4) | Free icon set, model-color tinted | 9 |
| TAM bar chart | Render from cited sources | 10 |
| Pricing cards (3) | Existing landing component, screenshot | 11 |
| Roadmap quarter chart | Build in Figma | 14 |
| Closing stat strip | Typography only | 15 |

---

## 11. Crosswalk to the report

The report (`docs/report_plan.md`) and this presentation must reinforce each other. Every figure in the report should appear in the deck, and vice versa. Crosswalk:

| Report Figure/Table | Presentation Slide |
|---|---|
| Figure 1 (Three-circle Venn) | Slide 2 |
| Figure 2 (Pipeline) | Slide 4 |
| Table 1 (Per-Advisor performance) | Slide 6 (`/leaderboard` screenshot) |
| Figure 3 (Calibration) | Slide 8 |
| Table 2 (Closed consensus trades) | Slide 7 (the 5/6 disclosure) |
| Figure 4 (H2H matrix) | Backup slide (only if asked about correlation) |

If a grader/listener cross-references the two deliverables, the numbers, terms, and visuals match exactly. That consistency is itself a credibility move.

---

*End of presentation plan. Pair with `report_plan.md` — the two are designed as a single integrated package.*
