# Oracle Trade — Design Direction

**Goal:** a landing page and product surface that convinces a visitor to pay within the first 10 seconds of looking at the screen. The reference points are Vercel and Linear — not because we should copy them, but because they've solved the problem of "premium, technical, expensive-feeling SaaS" better than anyone else in the last 3 years.

This doc is the plan. No code changes yet. Once we agree on direction, we execute in phases.

---

## 1. North Star

One sentence that should be true after the redesign:

> "If I saw this and didn't know what it cost, I'd assume it was $100/month and be surprised it's only $29."

That feeling comes from a specific vocabulary:

- **Density without clutter.** Lots of information per square inch, arranged so your eye never has to hunt. Think Bloomberg terminal, not Mint.
- **Confident restraint.** Few colors, few fonts, big negative space around small things. Nothing shouts.
- **Evidence over promise.** Every claim is backed by something visible — a live chart, a real ticker, a real timestamp — not a stock photo of a guy pointing at a laptop.
- **Motion as a signal, not a decoration.** Things animate to tell you something is working: a number tickers up, a status dot pulses, a line chart draws in. Nothing bounces or slides for style.
- **Quiet gradients.** A single subtle accent gradient in 1-2 places on the page. Not everywhere.

Things we're explicitly avoiding:

- ❌ Stock illustrations (the purple-and-teal "flat design people looking at laptops" genre)
- ❌ Feature checkmark lists with generic icons
- ❌ Cartoon emoji in product UI
- ❌ Gradients on every card
- ❌ Drop shadows that scream "Google Material 2018"
- ❌ Testimonials from made-up people with avatar circles

---

## 2. Current State Audit

### Landing page
- Hero is text-only: a headline, sub, two buttons. Above-the-fold has nothing else.
- "Stats" section uses hardcoded claims (`83%`, `+20%/month`) — reads like marketing, not evidence.
- "Works with" carousel is good (recently rebuilt).
- "How It Works" is a generic 3-card grid.
- "The Models" grid is just 5 colored dots + names.
- Pricing is a standard 3-tier card layout.

**Diagnosis:** there's no *product* visible on the landing page. A visitor leaves without ever seeing what the thing looks like or does. That's the single biggest issue.

### Dashboard
- Uses real data and has a decent information hierarchy, but:
  - Sidebar nav uses emoji icons (📊 📋) — these render as color bitmap glyphs, inconsistent across OS, and look cheap.
  - `🔥` / `🧊` streak badges on the leaderboard — same problem.
  - Greeting ("Good morning, Angelo") is friendly but wastes premium real estate up top.
  - "Today's Consensus Signal" card is the best thing on the page — it should be bigger and more dramatic.
  - Typography is uniform — no hierarchy between a headline number and a label.

### Design system
- Dark-only. CSS variables exist but there's no theme toggle, no `[data-theme="light"]` selectors.
- Palette is good: near-black bgs, 4 levels of depth, indigo accent. This is usable — we don't need to throw it away.
- Accent color (`#6366f1`) is defined but underused. It's not doing any work to brand the product.

---

## 3. Landing Page — Proposed Rebuild

Six sections, in order. Each has a specific reason to exist.

### 3.1 Hero (the 8-second pitch)

**What's on screen:**
- Bold headline: single sentence, max 7 words.
- Subhead: one sentence, max 20 words.
- Two CTAs: primary ("Start free trial") + secondary ("See it live").
- **A live product shot to the right or below** — this is the part that doesn't currently exist.

**Copy proposals (pick one, or iterate):**

Option A — outcome-focused
> **Trade the consensus, not the noise.**
> 5 frontier AI models watch the market every morning. When they agree, we trade for you.

Option B — product-focused
> **Your AI trading desk.**
> Five models. One consensus. Trades executed before the bell.

Option C — confident
> **The market's best idea, every morning.**
> We run five AI models on the open. When four agree, we buy.

**The visual:** a floating product mockup of the "Today's Consensus Signal" card (the good one from the dashboard) — full-size, with a real ticker, real prices, a subtle glow. Could be a static SVG-exported screenshot to start; later, a live component pulling from `/data/winner-today.json`.

**Motion:** the confidence number ticks up from 0% to its final value on load. The direction arrow animates once. Otherwise still.

**Background:** a very subtle animated grid or radial gradient behind the hero. Linear uses a slow-moving gradient mesh; Vercel uses a static grid with a radial light in the top-right corner. Either works. Keep it at ~5% opacity so it doesn't compete.

### 3.2 "Live now" ticker strip

A thin horizontal strip right under the hero showing **today's actual signals**. Example:

```
● LIVE — NVDA ↑ 4/5 agree · SPY ↑ 3/5 · BTC ↓ 3/5 · AAPL ↑ 3/5 · Last updated 9:02 AM ET
```

This is the single most important addition. A visitor realizes: *this isn't a mockup, it's running right now.* That's the Vercel/Linear "the product is real" moment.

Auto-refreshes from `winner-today.json` every 60 seconds. If no data, hides the strip entirely rather than showing placeholder text.

### 3.3 "Works with" carousel (keep)

The brokerage logo marquee we just built. Moves straight up, no changes needed.

### 3.4 How It Works — product-in-action

Drop the generic "01 / 02 / 03" cards. Replace with **three large feature sections**, each with:
- A real screenshot of the relevant product surface (Dashboard, Signals, Portfolio).
- A short paragraph of explanation.
- A pull-quote-style stat from actual data ("3,400 signals scored this year").

This is the Linear pattern — big asymmetric feature blocks with real product shots, alternating left/right. Not a grid of cards.

### 3.5 The Leaderboard — as a landing-page feature

Instead of "The Models" with 5 dots, **embed a simplified live leaderboard** — top 3 models by score, rendered with real numbers from `leaderboard.json`. This is proof that the experiment is real and the data is public.

Click any row → goes to `/scoreboard`. The call to action is implicit: "we publish everything; here are today's numbers."

### 3.6 Pricing — quieter

Current 3-tier layout is fine structurally. Needs:
- Remove feature-bullet checkmark circles. Use a thin divider and monospace prices.
- "Most Popular" badge: currently uses loud indigo. Use a quiet outlined treatment instead.
- Add a single-line trust note under the grid: *"Cancel anytime. No card required for the free tier."*

### 3.7 Footer

Currently one line. Add:
- Three columns: Product (Dashboard, Signals, Portfolio, Leaderboard), Company (Methodology, About, Pricing), Legal (Terms, Privacy, Disclaimer).
- Discord / X icons (small, monochrome).
- Keep the "Not financial advice" disclaimer.

---

## 4. Dashboard Polish

The dashboard is the first impression for paying users. Three fixes:

### 4.1 Kill the emoji

Replace with an icon library. Recommendation: **lucide-react** (same family as shadcn uses; Linear-style stroke icons).

```bash
npm install lucide-react
```

Specific swaps:
| Current | Where | Replacement |
|---|---|---|
| `📊` Leaderboard | Sidebar | `<Trophy size={16} />` |
| `📋` Paper Trading | Sidebar | `<LineChart size={16} />` |
| `🔥` Hot streak | LeaderboardTable | `<Flame size={12} />` filled orange |
| `🧊` Cold streak | LeaderboardTable | `<Snowflake size={12} />` filled blue |
| `◆` logo mark | Everywhere | Keep OR replace with a hand-crafted SVG wordmark |
| `↑` `↓` direction arrows | Several | Keep — Unicode arrows render cleanly as text |
| `→` `←` link arrows | Several | Keep |
| `✓` `✗` check/cross | ConsensusHighlight | Keep — these render as clean text glyphs |

The Unicode arrow symbols (`↑ ↓ → ←`) are *not* the problem — those are typographic and look fine. The emoji (`📊 🔥 🧊 📋`) are the problem because they render as color bitmaps from the system emoji font, which looks wildly different on Windows vs macOS vs mobile.

### 4.2 Promote the signal card

The "Today's Consensus Signal" card is the best component on the page. Make it:
- ~1.3× taller with more breathing room.
- Price ("avg_target") in a larger monospace display weight.
- The 5-of-5 agreement badge should use a pill with a subtle accent color border, not just text.
- Add a thin horizontal bar chart: % confidence, rendered as a subtle fill.

### 4.3 Rhythm

Currently the dashboard has uniform spacing between everything. Apply a typographic rhythm:
- Page header: `--space-8` below.
- Between major sections: `--space-12`.
- Within a section: `--space-4`.

This is a Linear hallmark — wide spacing around headers, tight spacing within data.

---

## 5. Light & Dark Mode

### 5.1 Architecture

Add a `data-theme` attribute on `<html>` and split the CSS variables by theme:

```css
:root[data-theme='dark'] {
  --bg-primary: #09090b;
  --bg-secondary: #0f0f11;
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --border-primary: rgba(255,255,255,0.06);
  --logo-filter: none;
  /* ... */
}

:root[data-theme='light'] {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
  --text-primary: #09090b;
  --text-secondary: #52525b;
  --border-primary: rgba(0,0,0,0.08);
  --logo-filter: invert(1);
  /* ... */
}
```

Accent colors (`--accent-primary: #6366f1`) stay the same in both themes — indigo works on both black and white. Positive/negative (`#22c55e` / `#ef4444`) also stay — they need to read as trading colors in both modes.

### 5.2 Theme toggle

A small icon button in the top-right of the navbar (and sidebar for the app shell). On click, toggles `document.documentElement.dataset.theme` and persists to localStorage. First load: read `prefers-color-scheme` media query, fall back to dark.

### 5.3 The logo problem

We just turned four brokerage SVG wordmarks white so they'd read on the dark landing. In light mode, white-on-white disappears.

**Solution:** use a CSS variable `--logo-filter` that's `none` in dark mode and `invert(1)` in light mode, applied to `.partnerLogo img`. The white SVG fills will invert to black on a white page. (Robinhood's green and Schwab's blue-on-white won't be affected in any visually wrong way — invert on green gives pink, which we don't want, so we need a carveout. Cleanest: mark those two logos with a class that skips the filter.)

Alternative: store two versions of each logo (`robinhood-dark.svg`, `robinhood-light.svg`) and swap based on theme. More work but more controllable.

Recommendation: start with the CSS-filter approach + carveout class; upgrade to two-file approach only if it looks wrong.

### 5.4 What has to change in every component

Search-and-replace work is limited because we already use variables everywhere. What needs attention:

- Hardcoded `#fff` or `#000` in inline styles — about 20 occurrences, grep and replace.
- `rgba(255,255,255,0.XX)` values for borders/backgrounds — these need to become variables.
- Chart colors in Recharts — the axis ticks, grid lines, and tooltip backgrounds have hardcoded dark values in ~6 components. These need to read from CSS variables via a small helper.

Estimated effort: **1 focused day** for a full light-mode pass.

---

## 6. Typography

Keep the current stack (Inter + IBM Plex Mono for numbers) — it's correct. Change:

- **Hero headline:** 4rem on desktop, letter-spacing `-0.04em`, weight 700. Currently 3.5rem/-0.035em/700. Slightly bigger, slightly tighter.
- **All monospace numbers get `font-variant-numeric: tabular-nums`.** This is a one-line change that makes every ticker and price align vertically in columns. It's the detail that makes trading UIs feel professional.
- **Optional upgrade:** Geist (Vercel's own font) is free and distinct. Would make the product feel distinctly Vercel-family. The trade-off is one more font file to load.

---

## 7. Motion

Rules:
- Any number that changes on load **should tick from its previous value to its new one** over ~400ms. (Balance, P&L, win rate, confidence %.)
- Status dots (live ticker, "5/5 agree") pulse once per 3s at 40% opacity.
- Section entries on scroll: fade up 8px over 300ms, stagger children by 60ms. Only once per session, not every scroll.
- Hover states: 120ms ease.
- **Nothing bounces. Nothing slides in from offscreen.** No Framer Motion spring physics on marketing copy.

Tools: CSS transitions for everything under 400ms. A tiny `useCountUp` hook for tickers. No Framer Motion unless we hit something a transition can't do.

---

## 8. The Indigo Accent, Used Properly

Current: defined, barely used. Propose:

- Primary CTA buttons: indigo gradient (6366f1 → 818cf8), 1px indigo border.
- "Today's Signal" card border: 1px indigo at 30% opacity.
- Links on hover: indigo underline.
- Chart primary line: indigo when there's only one series.
- Otherwise, no indigo. It should feel rare enough that when you see it, it means "this is the important thing."

---

## 9. Execution Plan

Five phases, each independently shippable.

### Phase 1 — Icon system (~2 hours)
Install lucide-react, swap all emoji references, keep Unicode arrows. Verify visual on both dashboard and sidebar. Low risk, high polish return.

### Phase 2 — Landing hero rebuild (~1 day)
- New headline + sub.
- Product-shot component showing the live consensus signal card.
- Subtle background grid.
- "Live now" ticker strip under hero pulling from `winner-today.json`.
- Count-up animations on hero numbers.

### Phase 3 — Landing feature sections (~1 day)
- Replace "How It Works" 3-card with 3 product-screenshot feature blocks.
- Replace "The Models" dot grid with an embedded top-3 live leaderboard.
- Tighten pricing section styling.
- Expanded footer.

### Phase 4 — Light/dark mode (~1 day)
- Refactor `design-system.css` into `[data-theme]` blocks.
- Theme toggle in navbar.
- Logo filter carveout.
- Chart variable refactor.
- Test every page in both themes.

### Phase 5 — Dashboard polish (~0.5 day)
- Signal card promotion (size + treatment).
- Spacing rhythm pass.
- Count-up on balance / P&L / win rate.
- Leaderboard streak badges → lucide icons.

**Total: ~4 days of focused work** to go from current state to premium.

---

## 10. Open Questions

1. **Hero headline direction** — outcome, product, or confident? Pick one before we build the hero.
Outcome / Confident.
2. **Stock numbers on landing** — keep the `83% / +20%/month / 5 / $29` stat grid? If yes, we need real sources for those numbers. If no, replace with real live numbers (total predictions, trading days, consensus hit rate).
You can pull the real numbers from the live data in simulation. Based on being up 9% in 
3. **Geist font upgrade** — yes or stay on Inter? Stay on Inter means zero risk; Geist gives the product a distinct typographic identity.
I've used Geist in a different project and liked it much better than inter. It felt very clean. please try to recapture that 'feel'.
4. **Live ticker strip data source** — `winner-today.json` gives us one consensus signal, but the strip should show 4-5 items. Do we broaden it to show top 5 individual predictions by confidence?
Sure. 
5. **Two-file vs filter approach for logo inversion in light mode** — do we care enough about Robinhood green and Schwab blue to ship two SVG files per logo?
No we don't care about that. We just care about it looking and feeling premium and consistent. 

Answer these and the implementation work becomes mechanical.

---

## 11. Deferred Work — Address Later

### Consensus threshold: raise from 3 → 4 across the entire codebase

The landing-page copy now says "When four agree, we buy," but the actual pipeline still uses `MIN_MODELS_AGREEING = 3`. Before we ship anything publicly that shows the new "four agree" language, the code and all supporting copy need to catch up.

**Files that need the change:**

Backend / pipeline:
- `scripts/winner.py:26` — `MIN_MODELS_AGREEING = 3` → `4`
- `scripts/winner.py:4` — module docstring (`3+ models agree` → `4+ models agree`)
- `scripts/winner.py:45` — function docstring same swap
- `scripts/winner.py:120` — log message (`no ticker with 3+ models agreeing`)

Frontend copy:
- `src/pages/Landing.jsx:25` — "When 3+ AI models agree on a trade"
- `src/pages/Landing.jsx:66` — "When 3 or more agree on a trade"
- `src/pages/Simulator.jsx:177` — empty state "when 3+ models agree on a stock pick"
- `src/pages/Alerts.jsx:15` — "When 3+ models agree on a direction"
- `src/components/TodaysWinner.jsx:11` — "Fewer than 3 models agreed"
- `src/pages/Dashboard.jsx` — any `model_count >= 3` threshold display
- `CLAUDE.md` — any prediction/consensus documentation
- `README.md`, `AI_MARKET_ORACLE_SPEC.md`, `PROMPT.md` — policy language if referenced

**Operational implications to think about before flipping the switch:**
- A `4/5` threshold is much rarer than `3/5`. Historical data shows ~78 unanimous days but only a fraction with 4+ agreement on the same ticker/direction. The simulator may open dramatically fewer trades. Decide if that's the intended behavior or if you want to adjust position sizing / frequency elsewhere to compensate.
- Past simulator P&L is based on the 3-threshold; changing to 4 invalidates historical comparisons. You may want a clean re-run from a fixed start date after the change.
- ETF leveraged trades currently key off a different constant (`ETF_MIN_MODELS`). Decide whether that should also move to 4 or stay separate.

One-shot grep to find any remaining references before the cutover:
```bash
rg -n "\b3\+?\s*(AI )?models?|three models|MIN_MODELS_AGREEING"
```
