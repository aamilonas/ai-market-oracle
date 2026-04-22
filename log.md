# Oracle Trade — Build Log

---

## Phase 0: Design System Foundation — COMPLETE

### Files Created
- `src/styles/design-system.css` — CSS custom properties: 4-level bg hierarchy (#09090b → #1a1a1e), rgba borders, 3-tier text colors, indigo accent (#6366f1), status colors, model colors, 8px spacing grid (space-1 through space-20), radius scale, shadow scale, sidebar width. Includes legacy aliases for backward compat with existing components.
- `src/styles/animations.css` — 8 keyframe animations (fadeUp, fadeIn, slideInRight, slideInLeft, scaleIn, shimmer, toastIn/Out, drawCheck, spin). 4 utility classes (.animate-in, .animate-fade, .animate-scale, .animate-slide-right). Stagger system (.stagger parent, 50ms delay per child, up to 10). Skeleton loading class. Spinner class.
- `src/context/AuthContext.jsx` — React Context with createContext. State: isLoggedIn, user, brokerageConnected, preferences, brokerageSettings. localStorage persistence with load/save.
- `src/context/useAuth.js` — Separated hook export to satisfy react-refresh lint rule. Single `useAuth()` hook.

### Files Modified
- `index.html` — Title → "Oracle Trade". OG tags updated. Font imports swapped from Inter/IBM Plex Mono → Geist/Geist Mono via Google Fonts.
- `src/index.css` — Full rewrite. Imports design-system.css + animations.css. Geist as primary font. Antialiased rendering. font-feature-settings cv02/cv03/cv04. Indigo selection color. Transparent scrollbar track. Recharts tooltip restyled.
- `.eslintrc.cjs` — Added `allowExportNames: ['AuthContext']` to react-refresh rule.

### Verification
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — 877 modules, 0 errors, built in 983ms

---

## Phase 1: App Shell & Sidebar Navigation — COMPLETE

### Files Created
- `src/components/Sidebar.jsx` — Linear-style sidebar navigation. Shows different nav groups based on auth state. Logged-out: Analysis (Leaderboard, Analytics, Paper Trading, Weekly Recap) + Info (Methodology, About) + "Get Started" CTA. Logged-in: Trading (Dashboard, Signals, Portfolio) + Analysis + Settings (Brokerage, Alerts, Configuration) + Logout. Active state with 2px indigo left accent bar.
- `src/components/Sidebar.module.css` — Fixed left sidebar, 240px wide. Group labels: 0.6875rem uppercase. Links: 0.8125rem, hover bg-tertiary transition 0.15s. Active: bg-tertiary + ::before pseudo-element (2px indigo bar). Mobile: translateX(-100%) off-screen.

### Files Modified
- `src/components/Layout.jsx` — Rewritten with dual layout system. FULL_WIDTH_ROUTES (/, /signup, /onboarding) render children without sidebar. All other routes render sidebar + main content area with footer.
- `src/components/Layout.module.css` — .fullWidth (min-height 100vh). .root (flex row). .main (margin-left: sidebar-width, flex column). .content (padding space-8, max-width 1100px). .footer (border-top, space between). Mobile: margin-left 0.
- `src/App.jsx` — Full rewrite. Wrapped in AuthProvider. 16 routes: Landing (/), Signup, Onboarding (full-width); Dashboard, Signals, Portfolio, ConnectBrokerage, Alerts, Settings (sidebar + auth); Leaderboard, Analytics, Paper Trading, Weekly, Model detail (sidebar + public); Methodology, About (sidebar + public). Legacy redirects for /scoreboard → Scoreboard, /simulator → Simulator.

---

## Phase 2: Landing Page — COMPLETE

### Files Created
- `src/pages/Landing.jsx` — Full marketing homepage. Sections: fixed nav with blur backdrop, hero (title + sub + 2 CTAs with animate-in), stats grid (4 cards with values), "How It Works" (3 step cards with hover lift), "The Models" (5 model cards linking to /model/:name), "Pricing" (3 tier cards — Free/Pro/Institutional, Pro highlighted with badge), footer.
- `src/pages/Landing.module.css` — Full-page styles. Nav: fixed, rgba bg + backdrop-filter blur(12px). Hero: 3.5rem title, 640px max-width. Stats: 4-col grid, tabular-nums. Steps: 3-col grid, hover translateY(-2px). Models: flex row with dot + name + accuracy. Pricing: 3-col grid, highlighted tier with accent border + "Most Popular" pill badge. Responsive breakpoints at 768px.

---

## Phase 3: Auth, Signup & Onboarding — COMPLETE

### Files Created
- `src/pages/Signup.jsx` — Centered card layout. Logo link back to /. Email + password form with validation. On submit: calls login() from AuthContext, navigates to /onboarding. "Prototype — No real account is created" disclaimer.
- `src/pages/Signup.module.css` — Centered flexbox page. 380px max-width card with bg-secondary + border. Inputs: bg-quaternary, focus ring accent-primary. Submit button: accent-primary with hover translateY(-1px).
- `src/pages/Onboarding.jsx` — 4-step card selection quiz. Steps: Account Size, Risk Tolerance, Preferred Sectors, Trading Frequency. Progress dots at top (active = indigo). Each step animate-in on transition. Final step calls updatePreferences() and navigates to /dashboard.
- `src/pages/Onboarding.module.css` — Centered page. Progress dots (8px circles). Option buttons: border cards with hover accent border + translateY(-2px). Step counter in Geist Mono.

### Stub Pages Created (placeholder content, will be built out in later phases)
- `src/pages/Dashboard.jsx` — Greeting with time-of-day + user name. Placeholder card.
- `src/pages/Signals.jsx` — Title + description + placeholder.
- `src/pages/Portfolio.jsx` — Title + description + placeholder.
- `src/pages/ConnectBrokerage.jsx` — Title + description + placeholder.
- `src/pages/Alerts.jsx` — Title + description + placeholder.
- `src/pages/Settings.jsx` — Title + description + placeholder.

### Verification
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — 877 modules, 0 errors

---

## Phase 5: Fake Robinhood Brokerage Connector — COMPLETE

### Files Modified
- `src/pages/ConnectBrokerage.jsx` — Full rewrite from stub. 4 brokerage cards in 2x2 grid (Robinhood enabled, Schwab/Fidelity/Webull disabled with "Coming Soon"). Modal-based mock OAuth flow: login step (email + password form, Robinhood-green themed) → permissions step (4 permission checkmarks, Authorize/Cancel) → success step (animated check, auto-dismiss after 2.5s). Post-connection settings panel: account balance display ($25,000), auto-trade toggle (animated switch), position size slider (1–10%), max daily trades select (1/2/3/5). All integrated with AuthContext (connectBrokerage(), updateBrokerageSettings()). Demo mode warning banner at top.
- `src/pages/ConnectBrokerage.module.css` — Full styles: brokerage card grid with hover lift, overlay with backdrop-filter blur(4px), modal with scaleIn animation, Robinhood-green (#00C805) themed inputs/buttons, animated toggle switch with knob translateX transition, custom range slider with accent thumb, permissions list with green checkmarks, success state with circular check icon, connected state with green dot header.

### Verification
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — 873 modules, 0 errors, built in 1.02s

---

## Phase 6: Dashboard & Trade Signals — COMPLETE

### Files Modified
- `src/pages/Dashboard.jsx` — Full rewrite from stub. Time-of-day greeting with user name. 4 quick stat cards with count-up animation (Total Predictions, Top Accuracy, Models Active, Leading Model). Consensus signal hero card from winner-today.json (ticker, direction badge, entry/target/expected move/confidence, model chips). Two-column layout: Today's Signals list (8 most recent, with ticker/direction/target/confidence/model) + Mini Leaderboard (ranked models with dot, name, accuracy, score). Skeleton loading state with shimmer. Responsive grid collapses at 768px.
- `src/pages/Dashboard.module.css` — Full styles: stats grid (4-col), hero card with top bar and body sections, direction badges (green/red), meta grid, model chips with colored borders, two-column panel layout, signal rows with hover states, leaderboard rows with rank/dot/name links, tabular-nums throughout.
- `src/pages/Signals.jsx` — Full rewrite from stub. Loads all model predictions for today, groups by ticker. Filter bar (All/Stocks/Crypto) with active state. Ticker cards showing: consensus direction, avg target, avg confidence, agreement ratio, per-model breakdown with colored dots. Consensus pick badge on winner-today ticker. Skeleton loading. Empty state for pre-market hours.
- `src/pages/Signals.module.css` — Full styles: filter pills, auto-fill grid (340px min), ticker cards with model breakdown rows, consensus card with accent border + badge, responsive single-column at 768px.

### Verification
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — 875 modules, 0 errors, built in 1.02s

---

## Phase 7: Portfolio, Alerts & Settings — COMPLETE

### Files Modified
- `src/pages/Portfolio.jsx` — Full rewrite from stub. Loads last 5 days of scored results via loadScores(). Converts score data to trade rows. 4 stat cards (Total Trades, Win Rate, Total Score, Avg Score/Trade) with positive/negative coloring. Full trade history table: date, ticker, model (color-coded), direction arrow, target, close, WIN/LOSS badge, score. Skeleton loading rows. Demo mode banner when brokerage disconnected. Responsive.
- `src/pages/Portfolio.module.css` — Full styles: stats grid, table with thead/tbody styling, hover rows, date/ticker mono cells, direction arrows, WIN/LOSS badges, score coloring.
- `src/pages/Alerts.jsx` — Full rewrite from stub. Two-column layout: alert feed (6 mock alerts with type icons — signal ◆, trade ⇄, score ★, system ●, unread highlight) + notification settings panel (5 toggleable notification types with descriptions). Unread badge counter. Brokerage connection note.
- `src/pages/Alerts.module.css` — Full styles: two-column grid, alert rows with icon coloring, unread state, notification toggles (same animated switch pattern), responsive collapse.
- `src/pages/Settings.jsx` — Full rewrite from stub. 5 sections: Account info (email, brokerage status, plan badge), Active Models (5 model toggles with colored dots), Consensus Threshold (slider + visual dot bar), Trading Preferences (from onboarding data + frequency select), Danger Zone (sign out with red border). All interactive.
- `src/pages/Settings.module.css` — Full styles: section layout (600px max-width), card rows, model toggle rows, consensus slider + threshold dots, select dropdown, danger zone with red border/button.

### Verification
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — 878 modules, 0 errors, built in 1.08s

---

## Phase 8: Rebrand & Restyle Existing Pages — COMPLETE

### Global Changes
- **Font migration:** Replaced all `'IBM Plex Mono'` references with `'Geist Mono'` across 16 files (10 CSS modules, 3 JSX files, 3 component CSS files).
- **Title styling:** Updated `font-weight: 800` → `600` across all legacy page CSS modules for consistent Linear/Vercel aesthetic.
- **Animations:** Added `animate-in` class to root `<div>` of all 7 legacy pages (Scoreboard, Analytics, ModelPage, Weekly, Methodology, About, Simulator) for page-enter fade-up animation.
- **Navigation fix:** Updated ModelPage.jsx back link from `"/"` to `"/dashboard"` to route to new dashboard instead of landing page.

### Files Modified (CSS Modules — font + weight)
- `src/pages/Scoreboard.module.css`
- `src/pages/Analytics.module.css`
- `src/pages/ModelPage.module.css`
- `src/pages/Weekly.module.css`
- `src/pages/Methodology.module.css`
- `src/pages/About.module.css`
- `src/pages/Simulator.module.css`
- `src/pages/Home.module.css`
- `src/components/LeaderboardTable.module.css`
- `src/components/WeeklySummary.module.css`
- `src/components/ConsensusHighlight.module.css`
- `src/components/ModelProfile.module.css`
- `src/components/TodaysWinner.module.css`
- `src/components/PredictionCard.module.css`
- `src/components/ScoreChart.jsx`

### Files Modified (JSX — animate-in + links)
- `src/pages/Scoreboard.jsx`
- `src/pages/Analytics.jsx`
- `src/pages/ModelPage.jsx`
- `src/pages/Weekly.jsx`
- `src/pages/Methodology.jsx`
- `src/pages/About.jsx`
- `src/pages/Simulator.jsx`

### Verification
- `npm run lint` — 0 errors, 0 warnings
- `npm run build` — 878 modules, 0 errors, built in 1.05s