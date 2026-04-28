# Oracle Trade — Marketing & Disclosure Strategy

**Objective:** position Oracle Trade as a premium, technically sophisticated fintech product. Loudly showcase the Advisor LLM panel, the 4-of-5 consensus rule, and the live 83% consensus-trade hit rate. Document the methodology in full and let the receipts do the work.

**The strategic stance:** the *concept* of "use a panel of frontier LLMs and only trade when they agree" is replicable on a napkin. What a competitor cannot copy is:

- Sixty days of publicly audited signals.
- An 83% hit rate across real consensus trades, scored against real market closes.
- A production pipeline that runs unattended, every weekday, without missing a day.
- Working brokerage integrations (Robinhood, Schwab, Fidelity, Webull, E\*TRADE, Interactive Brokers).
- The specific research brief, the data conditioning layer, and the adapter engineering, all documented and disclosed in the public repo.

So we brag about the panel. We brag about the threshold. We brag about the hit rate. And we publish the prompt. The moat is the receipts and the operational discipline, not secrecy.

---

## 1. Positioning Principle — "Brag About the Panel, Defend With the Receipts"

Three principles, applied everywhere:

1. **Lead with the Advisor LLMs.** The panel is a headline feature, not a trade secret. Naming Claude, GPT-4o, Gemini, Perplexity, and Grok in the same breath signals we're working at the frontier of every major AI lab simultaneously — that's a credibility move no one-vendor shop can match. Use the word **"Advisor LLMs"** as the product-facing term. It sounds institutional, it differentiates from "chatbots," and it puts the panel in a professional frame.
2. **Receipts are the moat.** Every claim we make — "83% correctness on consensus trades," "60 days live," "+9% paper-traded return" — anchors to a publishable, verifiable number. The leaderboard, the analytics dashboard, the simulator page: these are weapons. Use them.
3. **Transparency is the differentiator.** The full research brief, the data conditioning layer, and the scoring math are all public. Most retail fintech hides their methodology; we publish ours. Openness is itself a credibility signal in a category where the default is opacity.

**Tone:** confident, technical but not jargon-heavy, institutional. Think Mercury, Ramp, Carta, Pipe — not Robinhood or Webull. Every claim anchored to a number. No rocket emojis. No "revolutionary." No "disrupt."

---

## 2. The Lexicon

What to say, what to dodge, what never to say.

### Hero vocabulary — use proudly

| Term | When to use | Why it works |
|---|---|---|
| **"Advisor LLM"** / **"Advisor panel"** | Every public surface | Our coined framing — elevates the panel from "AI models" to something that sounds like a team of quant researchers. |
| **"4-of-5 consensus"** | Describing when a trade fires | Specific, memorable, hard to misread. The 4/5 threshold is a marketing asset, not a secret. |
| **"Trades execute with 83% correctness"** | Whenever track record comes up | Single most important stat we own. Memorize the phrasing. |
| **"Claude, GPT-4o, Gemini, Perplexity, and Grok"** | In technical copy and the landing | Naming them is a flex — we run the best of Anthropic, OpenAI, Google DeepMind, Perplexity, and xAI at once. |
| **"Pre-market consensus signal"** | Output framing | Time-boxes the edge (before the open) and emphasizes agreement over prediction. |
| **"Systematic execution"** | Describing discipline | Opposite of "discretionary." Signals rigor and repeatability. |
| **"Publicly audited track record"** | Defending against skepticism | No hedge funds do this. We do. It's our biggest structural advantage. |
| **"Confidence-weighted scoring"** | In the methodology story | Distinguishes us from pass/fail prediction platforms. |

### Technical vocabulary — use freely in deep-dive contexts

| Term | Use case |
|---|---|
| **"Ensemble"** | Analytics page, methodology page |
| **"Cross-model agreement"** | Describing the aggregation principle |
| **"Calibration"** | Talking about confidence buckets |
| **"Conviction threshold"** | Synonym for the 4-of-5 rule when you want variety |
| **"Independent reasoning"** | Emphasizing that each Advisor LLM runs in isolation |

---

## 3. Disclosure Stance

Same depth to every audience. The marketing site, the methodology page, investor conversations, and class presentations all get the same answer: full architecture, the actual research brief in `PROMPT.md`, the scoring formula, the data sources, and the live track record. There is nothing to redact and no tiered reveal.

When someone asks "how does this work?", the answer is "here's the prompt, here's the pipeline, here's the leaderboard." Transparency does the credibility work that secrecy used to. The receipts and the operational discipline are the moat; the methodology is a recruiting and trust asset, not a trade secret.

---

## 4. Rewriting the Current Site

Concrete before/after copy. Drop-in replacements for the actual components.

### Hero (Landing.jsx)

**Current:**
> The market's best idea, every morning.
> Five frontier AI models watch the open. When four agree, we trade for you.

**This is already close. Sharpen it:**

> The market's best idea, every morning.
> Five Advisor LLMs. One consensus trade. 83% hit rate.

**Or — longer, higher-conviction variant:**

> The market's best idea, every morning.
> An independent panel of five Advisor LLMs — Claude, GPT-4o, Gemini, Perplexity, and Grok — analyzes every open. When four agree on the same call, we execute through your brokerage.

### Eyebrow pill

**Current:** "Live trading · 4/5 consensus required"

**Keep it.** This is the right disclosure. Optionally: "Live · 4-of-5 Advisor consensus."

### Hero sub — optional third line above the fold

Add the proof stat under the CTAs:

> Currently running at 83% correctness across consensus trades — live, auto-updating, publicly audited.

### Feature block 01 — "Consensus, not predictions"

**Current bullets name the models already — keep that.** Tighten the body:

> Anyone can call a stock. Oracle Trade only surfaces trades that clear our conviction threshold — an independent 4-of-5 agreement across Claude, GPT-4o, Gemini, Perplexity, and Grok. When they align on direction, ticker, and timeframe, we execute. When they don't, we stay out.

**Replacement bullets:**
- **Five Advisor LLMs.** Claude, GPT-4o, Gemini, Perplexity, Grok — the frontier of every major research lab, every morning.
- **Four-of-five consensus required.** Unanimity isn't necessary; conviction is. A supermajority filter kills flukes and noise.
- **Every call, scored against reality.** Publicly. Forever. 83% correctness on trades that cleared the threshold.

### Feature block 02 — Execution

Keep largely as is. Optionally add a stat line:

> 6 supported brokerages. Trades execute automatically through Robinhood, Schwab, Fidelity, Webull, E\*TRADE, and Interactive Brokers.

### Feature block 03 — "Every call, on the record"

Keep. Add a reinforcing closing line:

> Most systems ask you to trust them. We ask you to check our work.

Under this block, surface a compact number strip — "525 predictions scored · 60 trading days · 83% consensus correctness · +9% paper return."

### Methodology page (Methodology.jsx)

This page does real sales work. Rewrite it as a transparency showcase:

> **How Oracle Trade works**
>
> Every weekday morning between 8:30 and 9:30 AM Eastern, we run five Advisor LLMs against fresh pre-market data: Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google DeepMind), Perplexity Sonar (Perplexity AI), and Grok (xAI). Each advisor receives the same standardized research brief and returns 3–5 specific, falsifiable stock predictions — ticker, direction, target price, confidence score, and timeframe.
>
> **The 4-of-5 consensus rule.** We only execute a trade when four of the five Advisor LLMs independently agree on the same ticker and direction. Three-advisor agreement is interesting; four-advisor agreement is actionable. One advisor on its own is noise.
>
> **Current correctness: 83%.** Across every trade that's cleared the consensus threshold to date. We score every individual prediction, and we score every executed trade, and we publish both. The scoring formula (below) is simple, transparent, and punishes overconfident wrong calls.
>
> **What's published.** The full research brief lives in `PROMPT.md` in the repo. The aggregation rule, scoring math, data sources, and full track record are all documented on this page. Nothing about how the system works is gated, NDA'd, or paywalled. The cost of replicating Oracle Trade is not access to the methodology; it is sixty days of live signals, six brokerage integrations, and the operational discipline to run unattended every weekday.

Then keep the scoring formula section intact. It's a strength.

### About page (About.jsx)

You can name specific model IDs here (`claude-sonnet-4`, `gpt-4o-search-preview`, `gemini-2.5-flash`, `sonar-pro`, `grok-3`) in a "Tech stack" section. Specific model versions are a credibility signal, not a vulnerability.

---

## 5. The Track Record Is the Weapon

Treat the leaderboard, analytics, and simulator pages as marketing assets — not just product surfaces.

- **Promote the 83% headline everywhere.** Hero stat strip, feature block 01 close, methodology page opener, footer trust line. Whenever there's white space, the 83% goes in it.
- **Caveat honestly.** Across *n* consensus trades to date — the simulator currently shows 5 wins out of 6 closed trades. Disclose the sample size when pressed. Refusing to acknowledge small sample size looks evasive; acknowledging it looks sharp. **Update the 83% number as sample grows** — if the rolling figure drops to 75% across 20 trades, update the copy. Never publish a stale claim.
- **Publish the scoring formula in full.** Direction correct: +confidence. Wrong: −confidence. Bonus: +0.5 if within 1% of target. Detailed enough to look rigorous; useless for copying because it's an evaluation rule, not a generation rule.
- **Show the leaderboard on the landing page.** `TopModelsPreview` is already built. Name the Advisor LLMs there proudly — seeing GPT-4o at +53.82 points and Perplexity at +3.69 is a visual demonstration of "they don't all agree, which is exactly why consensus matters." That story is a *feature*, not a weakness.
- **Show calibration on the analytics page.** "When our panel says 70% confidence, are they right 70% of the time?" — this chart is institutional-grade proof of rigor. Very few retail platforms can or will publish this.
- **Head-to-head records.** Keep the matrix. "GPT-4o beats Claude 16-2 on same-ticker same-day calls" is an extraordinarily interesting public stat. It's also *proof of independence* — if the advisors were herding, this matrix would be all ties.

---

## 6. Handling Tough Questions

Rehearse these until they're second nature.

**"So you just ask five chatbots and take the majority vote?"**
> That's the simplest possible framing, and it misses the work. The Advisor LLMs get a carefully constructed research brief that standardizes inputs, enforces output structure, and calibrates for confidence bias. They run with live pre-market data — not stale snapshots. We've tuned which models to trust on which signals, how to handle model failures gracefully, and when to override the consensus. The panel is the headline; the infrastructure underneath is where the work is.

**"Isn't the prompt the real product?"**
> It's published. The prompt without sixty days of live signals, without brokerage integration, without the scoring framework, without running reliably every morning is just a paragraph in a text file. The system is the product, and the system runs.

**"Why Claude, GPT-4o, Gemini, Perplexity, and Grok specifically?"**
> Diversity of reasoning. They're trained on different data mixes, by different labs, with different alignment approaches. Their failures are uncorrelated — when four of them land on the same call, that agreement actually means something. If I polled five instances of the same model, I'd just be measuring that model's bias five times.

**"What's your edge when LLMs get commoditized?"**
> LLMs being commoditized *helps* us. Cheaper inference means we can expand the panel, run more frequently, and scale to more users at lower cost. The defensible layer has never been the models. It's the aggregation, the published methodology, and the trust we build by showing our work. Those compound with time; model capability is a utility we plug into.

**"How do you handle when the consensus is wrong?"**
> We log it publicly, we score it against the market, and we let the sample grow. A systematic approach with an 83% hit rate will still lose 17% of the time. That's not a bug — that's what "systematic" means. A strategy that claims to never lose is either lying or will blow up spectacularly.

**"What's stopping Anthropic or OpenAI from building this themselves?"**
> They could. They won't, because consensus trading is a terrible fit for a single-model lab — the whole premise is that no one model is enough. It's exactly the kind of product that a small independent operator can build and a large lab can't. That's the wedge.

**"What if one of the labs shuts off their API?"**
> We've designed the panel for graceful degradation. Losing one Advisor drops us to 4-of-4 consensus, which we'd re-evaluate. The system isn't single-model-dependent, and that's by design.

**"What about regulation?"**
> We operate as a signals platform plus brokerage integration, not a registered advisor. Pro users opt into automated execution through their own brokerage accounts. We publish every call; we don't take custody of funds. I've been careful about the regulatory surface from day one.

Rehearse all eight. The last one matters more than it looks — professors sometimes fish for compliance awareness.

---

## 7. The Moat Story

The moat is **not** the concept. Anyone with five API keys and a weekend can build something that looks like this. The moat is a stack of four things, any one of which would be a defensible business on its own:

1. **The track record.** 60 days live, 525 predictions scored, 83% consensus-trade hit rate. A competitor starting today can replicate the architecture in a week; they cannot replicate the receipts. Trust in this category compounds daily.
2. **The research brief.** The prompt is published in `PROMPT.md`. It represents months of iteration on how to extract calibrated, parseable, comparable forecasts from five different model APIs. A competitor can read it tonight and still has to spend the months proving any modifications work in production. The engineering is in the iteration, not the obscurity.
3. **The brokerage integrations.** Six live broker connections (Robinhood, Schwab, Fidelity, Webull, E\*TRADE, IB) are a compliance and integration moat measured in months-of-work per broker. This is the regulated moat that actually matters once the product scales.
4. **Operational discipline.** Running unattended every weekday, handling model failures, propagating data updates to the frontend, scoring every call — the ops story is boring and exactly why competitors give up after three weeks.

When a skeptical classmate says *"I could build this,"* the answer is: *"Probably. In the weekend. Let's meet back here in sixty days with your track record, your brokerage connections, your calibration chart, and your uptime log. Whoever's numbers look better gets the business."*

That's the pitch.

---

## 8. Repository Disclosure

Everything in the repo is public-facing. The prompt, the adapters, the data conditioning logic, and the dev notes can all sit in a public repository without redaction. The only items that stay private are credentials (API keys, brokerage tokens) and customer PII once we have any. Neither is intellectual property; both are standard operational hygiene.

| Asset | Action |
|---|---|
| `PROMPT.md` | Public. The prompt is the centerpiece of the methodology page; link to it from the marketing site. |
| `scripts/adapters/*` | Public. Read by anyone who wants to see how each model API is wrapped. |
| `scripts/market_data.py` | Public. The yfinance + FRED data formatting is documented in plain code. |
| `AI_MARKET_ORACLE_SPEC.md` | Public. The v1 spec including the literal prompt. |
| `IMPROVEMENT_PLAN.md` / `qa.md` / `CLAUDE.md` | Public. Internal dev notes that demonstrate iteration discipline; useful as evidence, not embarrassing. |
| GitHub repo visibility | Public. Showing the work is a recruiting and credibility asset. |
| Leaderboard / Analytics / Scoreboard / Landing / Methodology pages | Public. These are the marketing assets. |
| API keys, brokerage credentials, customer PII | Private. Standard operational hygiene. |

**Net change from earlier guidance:** the prompt, the adapter engineering, and the data conditioning layer move from the private side to the public side. The moat shifts from secrecy to receipts and operational track record.

---

## 9. Class Presentation Playbook

### 60-second elevator

> Oracle Trade is a consensus-trading product for retail investors. Every morning before the market opens, a panel of five Advisor LLMs — Claude, GPT-4o, Gemini, Perplexity, and Grok — independently analyze the open. When four of the five agree on a trade, we execute it automatically through the user's brokerage. Sixty days in, we're running at 83% correctness on consensus trades, with a publicly audited leaderboard and a paper-traded portfolio up 9%. The panel is the headline; the research brief behind it and the brokerage integration layer are where the actual work is.

Memorize this. Say it smoothly. Never skip the 83%.

### 5-minute demo

1. **0:00–0:30 — Problem.** "Retail investors lose to the market, not because they don't know the names, but because they can't be systematic."
2. **0:30–1:30 — The product.** Open landing page. Show the hero. "These are the five Advisor LLMs. They analyze every open. Four of five have to agree before we trade." Click through to the Dashboard. "Today's consensus signal. Ticker. Target. Confidence. Advisor chips showing which panel members agreed."
3. **1:30–3:00 — The receipts.** Scroll to the live ticker strip on the landing. "These are today's predictions, live right now." Navigate to `/leaderboard`. "This is every model's individual track record — notice they don't all agree, which is the whole point." Navigate to `/analytics`. "This is calibration. When we say 70% confidence, we should be right 70% of the time. This is head-to-head between advisors. This is the hit rate across consensus trades." End: "83% — across every consensus trade we've executed, scored against every close."
4. **3:00–4:00 — Business.** Free tier: leaderboard + signals, no execution. Pro: $100/month for accounts under $25K, or 5% of returns on accounts $25K+. Institutional: $499/month, API access.
5. **4:00–5:00 — The moat.** "You could build this in a weekend. You cannot build this with sixty days of live history, six brokerage integrations, and an 83% audited hit rate. That's what I'm selling."

### 15-minute deep-dive

Add after the 5-min:
- **5:00–8:00 — Scoring math.** Walk the `+confidence / −confidence / +0.5 target bonus` formula. Show the calibration chart. Explain why penalizing confident-wrong calls more than rewarding confident-right calls encourages honest confidence.
- **8:00–11:00 — Architecture on the whiteboard.**
  ```
  [Pre-market data: yfinance + FRED]
       ↓
  [Advisor LLM panel: Claude, GPT-4o, Gemini, Perplexity, Grok]
       ↓
  [Research brief — published in PROMPT.md]
       ↓
  [Consensus layer: 4-of-5 agreement on ticker + direction]
       ↓
  [Paper-traded portfolio + alerts + broker execution]
       ↓
  [Public scoring: leaderboard, analytics, audit]
  ```
  Talk through every box. When you hit the **Research brief** box, point to `PROMPT.md` and say: *"That's the actual prompt every Advisor receives. It's in the public repo. The work isn't in keeping the prompt secret. It's in the months of iteration to make five different model APIs produce comparable, calibrated, parseable output, and in the sixty days of receipts behind it."* Transparency reads as confidence.
- **11:00–13:00 — What could go wrong.** Be preemptive. Topics to raise: advisor-level correlation, regime change, model deprecation, brokerage ToS risk, overfitting to 60 days, fee structure scaling. Having rehearsed self-critique is the single biggest credibility signal in a pitch.
- **13:00–15:00 — Roadmap.** Options trading, crypto consensus, sector-specific advisor panels, institutional API, white-labeled for wealth advisors.

---

## 10. Tone & Voice

### Do
- Use the product's voice: "Oracle Trade runs..." not "I built..."
- Anchor every claim to a number.
- Use "Advisor LLM" — it's our coined term and it's a small differentiator that stacks.
- Drop the 83% hit rate + 4-of-5 consensus in combination. Always together, always in that order. It's the product's signature line.

### Don't
- Say "AI" where you can say "Advisor LLM." Small upgrade, big compounding effect.
- Promise returns. Past performance stat (83%) is fine. Guaranteeing future performance is SEC-territory.
- Use hedges like "basically," "kind of," "pretty much." Say it or don't.
- Promise specific dollar returns. Past performance stats (83%) are fine. Guaranteeing future P&L is SEC-territory.

---

## 11. One-Sentence Pitch (memorize)

> Oracle Trade is a consensus-trading product that runs a panel of five Advisor LLMs — Claude, GPT-4o, Gemini, Perplexity, and Grok — every morning before the open, executes a trade through your brokerage when four of the five agree, and currently runs at 83% correctness on consensus trades — all publicly audited.

Read it once out loud. It should trip smoothly. If it feels long, break it at the em-dash for a breath. Every specific noun is a credibility anchor: five, Claude, GPT-4o, Gemini, Perplexity, Grok, four, brokerage, 83%, publicly audited. That's ten credibility anchors in one sentence.

---

## 12. The 80/20

If you only do five things from this doc:

1. **Update the hero** to say: *"Five Advisor LLMs. One consensus trade. 83% hit rate."* Feature block 01 bullets — replace with the versions in §4.
2. **Update the methodology page** per §4. Link directly to `PROMPT.md` from it; the prompt is the centerpiece, not a redacted footnote.
3. **Memorize the one-sentence pitch in §11.** Use it as your opening every single time anyone asks what you're building.

Everything else in this doc is optimization on top of those five.

---

## Appendix — Maintaining the 83% claim honestly

The headline stat — "83% correctness on consensus trades" — is currently backed by 5 wins out of 6 closed consensus trades. Small sample. This number will move as the pipeline runs. Rules for keeping the claim honest:

- **Always round to the current figure.** Don't freeze at 83% if the rolling figure drops.
- **Add the sample size** whenever someone asks, in writing or spoken: "83% across 6 consensus trades to date, 60 days live."
- **Build the claim into the data.** The Landing hero currently pulls `simulator.json` at build time. Good — the copy is tied to live data. The words "83% hit rate" should eventually be a dynamic value too, not a hardcoded string in copy. Until we wire that up, keep it hardcoded but check it every time you deploy.
- **When the sample grows past 20 trades**, the claim gets more defensible. If it holds at 75%+ across 20 trades, that's an institutional-grade stat. If it drops to 55%, be honest about it — the credibility you earn by disclosing a worse number is still more valuable than a flattering one.
