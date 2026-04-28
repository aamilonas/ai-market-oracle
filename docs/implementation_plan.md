# Implementation Plan — Expanded Pre-Market Data Layer

**Goal.** Extend the pre-market context block fed to every Advisor LLM with four new structured data feeds. Closes the calendared-event gap, adds canonical crypto signals, and brings institutional positioning data into the panel's view. Total cost: $0 across all four sources.

**Status.** Specification complete. Ready for engineering.

---

## Background

Today the morning pipeline pulls two data sources before calling the Advisors:

- `scripts/market_data.py` (`yfinance`) — equity and crypto closes, VIX, ^TNX
- `scripts/fred_data.py` — macro rates, CPI, unemployment, treasury spread

Gaps the Advisors currently guess at:

1. Is there a major earnings release today? An FOMC meeting? A CPI print at 8:30?
2. For crypto predictions, what does broader crypto sentiment look like beyond price?
3. Are we in a week with crude oil or natural gas inventory releases?
4. How are commercial hedgers vs. speculators positioned in the major futures contracts?

Each of these is a known input that retail platforms ignore and that institutional desks read as a default. Bringing them into the prompt closes the gap without herding the panel toward a single narrative — every feed below is structured data, not editorial commentary.

---

## Priority 1 — Finnhub: Earnings + Economic Calendar

**Why first.** Highest-impact, lowest-friction integration. Knowing AAPL reports tonight or that FOMC speaks at 2pm changes confidence calibration for every model. Currently a silent variable.

**API.**
- Provider: Finnhub Stock API
- Base URL: `https://finnhub.io/api/v1`
- Endpoints used:
  - `/calendar/earnings?from={date}&to={date}` — companies reporting today and tomorrow
  - `/calendar/economic?from={date}&to={date}` — Fed events, CPI/PPI/jobs releases, central-bank decisions
  - `/calendar/ipo?from={date}&to={date}` — relevant for sentiment around new listings (optional)
- Free tier: 60 calls/min, 30 calls/sec
- Auth: API key as `?token=` query param

**File to add: `scripts/finnhub_data.py`**

```
def get_earnings_today(date_str): -> list[dict]
    # returns [{ticker, eps_estimate, revenue_estimate, hour}]
    # filtered to S&P 500 + Nasdaq 100 to keep block size manageable

def get_economic_calendar(date_str): -> list[dict]
    # returns [{event, country, impact, time}]
    # filtered to country='US' and impact in ('high', 'medium')

def get_calendar_block(date_str): -> str
    # composes both into a formatted text block for the prompt
```

**Pipeline change: `scripts/generate.py`**

Append the calendar block to the market context after FRED data, before the adapter loop:

```
calendar_block = finnhub_data.get_calendar_block(date_str)
if calendar_block:
    market_context += "\n\n" + calendar_block
```

**Secret to add.** `FINNHUB_API_KEY` in GitHub Actions secrets.

**Effort.** 2 hours. Mirrors the `fred_data.py` pattern exactly.

---

## Priority 2 — CoinGecko: Crypto Market Data

**Why.** Every Advisor makes at least one BTC-USD prediction most days. Right now the panel sees only price. Adding BTC dominance, total crypto market cap, and the canonical Fear & Greed Index gives them the same context a crypto-native trader would have.

**API.**
- Provider: CoinGecko (public) + Alternative.me Fear & Greed
- Base URLs: `https://api.coingecko.com/api/v3`, `https://api.alternative.me/fng`
- Endpoints used:
  - `/global` — total market cap, BTC dominance, ETH dominance, 24h volume
  - `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10` — top 10 by cap with 24h % change
  - Alternative.me Fear & Greed — single-value sentiment index (0–100)
- Free tier: 30 calls/min, no API key required
- Auth: none

**File to add: `scripts/coingecko_data.py`**

```
def get_global_market_data(): -> dict
    # {total_mcap_usd, btc_dominance, eth_dominance, 24h_volume_usd}

def get_top_movers(): -> list[dict]
    # top 10 coins with 24h pct change

def get_fear_greed_index(): -> dict
    # {value: int 0-100, classification: 'Fear' | 'Greed' | etc.}

def get_crypto_block(): -> str
    # formatted text block for the prompt
```

**Pipeline change.** Append crypto block to market context after the calendar block.

**Secret.** None required.

**Effort.** 1.5 hours. No auth makes this the simplest of the four.

---

## Priority 3 — EIA: Energy Inventory Reports

**Why.** Wednesday crude inventories and Thursday natural gas storage reports move energy stocks (XLE, USO, XOM, OXY) in predictable directions. Models without this signal treat energy tickers as noise. Models with this can call the print.

**API.**
- Provider: U.S. Energy Information Administration
- Base URL: `https://api.eia.gov/v2`
- Endpoints used:
  - `/petroleum/stoc/wstk/data` — weekly U.S. crude oil stocks (commercial)
  - `/natural-gas/stor/wkly/data` — weekly natural gas in storage
  - `/petroleum/pri/spt/data` — WTI and Brent spot prices (sanity check vs. yfinance)
- Free tier: 5,000 calls/hour
- Auth: API key as `?api_key=` query param

**File to add: `scripts/eia_data.py`**

```
def get_crude_inventory(): -> dict
    # {as_of_date, value_thousand_bbl, change_vs_prior, prior_value}

def get_natgas_storage(): -> dict
    # {as_of_date, value_bcf, change_vs_prior}

def get_energy_block(): -> str
    # only include in prompt on days when fresh data is < 7 days old
    # Wednesdays + Thursdays mostly
```

**Pipeline change.** Conditionally append energy block; skip on days where the most recent EIA print is stale.

**Secret to add.** `EIA_API_KEY`.

**Effort.** 2 hours.

---

## Priority 4 — CFTC Commitment of Traders

**Why.** Weekly net positioning of commercial hedgers (large producers, utilities, banks) versus speculators (hedge funds, CTAs) in major futures. This is the institutional-positioning signal that retail platforms refuse to surface. A genuine differentiator for the panel and a strong talking point in the pitch.

**API.**
- Provider: CFTC (Commodity Futures Trading Commission), via Socrata Open Data
- Base URL: `https://publicreporting.cftc.gov/resource/6dca-aqww.json`
- Endpoint: filtered by `market_and_exchange_names` for the contracts we care about
- Contracts to pull:
  - `S&P 500 STOCK INDEX - CHICAGO MERCANTILE EXCHANGE`
  - `NASDAQ-100 STOCK INDEX (MINI) - CHICAGO MERCANTILE EXCHANGE`
  - `2-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE`
  - `10-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE`
  - `GOLD - COMMODITY EXCHANGE INC.`
  - `WTI CRUDE OIL - NEW YORK MERCANTILE EXCHANGE`
- Cadence: Weekly (Tuesday close, published Friday afternoon)
- Free, public domain
- Auth: none, optional Socrata app token for higher rate limits

**File to add: `scripts/cot_data.py`**

```
def get_latest_cot_report(contract_name): -> dict
    # {as_of_date, commercial_long, commercial_short, noncommercial_long,
    #  noncommercial_short, net_commercial, net_noncommercial}

def get_cot_block(): -> str
    # multi-row table summarizing positioning across 6 contracts
    # only included Mon/Tue (when Friday's release is fresh in the panel's mind)
```

**Pipeline change.** Append COT block to market context. Cache locally since the data only updates once per week.

**Secret.** None required (or optional Socrata app token).

**Effort.** 3 hours. Most parsing work of the four.

---

## Suggested Order of Execution

| # | Task | Effort | Impact | Depends on |
|---|------|--------|--------|-----------|
| 1 | Finnhub calendar integration | 2h | High | Finnhub key |
| 2 | CoinGecko crypto block | 1.5h | Medium-High | None |
| 3 | EIA energy inventories | 2h | Medium | EIA key |
| 4 | CFTC COT positioning | 3h | High (story) | None |

**Total engineering effort: 8–9 hours.** Single afternoon to a day, including testing.

---

## Prompt Block Layout

Order of appended blocks in the final market context the Advisors receive:

1. yfinance equities and crypto (existing)
2. yfinance VIX and ^TNX (existing)
3. FRED macro indicators (existing)
4. **Finnhub earnings + economic calendar** (new)
5. **CoinGecko global crypto state + Fear & Greed** (new)
6. **EIA crude + natural gas inventories** (new, conditional on freshness)
7. **CFTC commitment-of-traders positioning** (new, conditional on day-of-week)

Each block is preceded by a short header so the Advisor can parse it. No editorial framing in any block. Numbers and labels only.

---

## Anti-Herding Defense

The original `IMPROVEMENT_PLAN.md` Priority 4 constraint: no single news source, because it would point all Advisors at the same narrative. That constraint is preserved here. Every feed in this plan is structured numerical or calendar data, not journalistic commentary. Two Advisors reading the same Finnhub earnings calendar will reach independent conclusions about whether the upcoming release is bullish or bearish for the stock. They cannot herd on a fact.

---

## Failure Modes and Graceful Degradation

The morning workflow already tolerates partial data failures (one model down does not stop the others). Each new data source must follow the same pattern:

- Wrap each fetch in a try/except.
- On failure, log a warning and append nothing to the context.
- Never block the morning run on a data-source outage.

The pipeline's existing health-check step in `morning.yml` will surface any individual data-source failure via the failed-models email notification, so silent degradation is avoided without coupling the Advisor pipeline to any external API's uptime.

---

## Required GitHub Secrets

Add to repo Settings → Secrets and variables → Actions:

```
FINNHUB_API_KEY=...     # https://finnhub.io/dashboard
EIA_API_KEY=...         # https://www.eia.gov/opendata/register.php
```

CoinGecko and CFTC need no key.

---

## Testing Plan

1. Run each new module's `get_*_block()` function in isolation against a known date. Verify output is well-formed text.
2. Compose the full market context for a recent date with all four new blocks appended. Verify total prompt size remains under each Advisor's token budget. Current context is roughly 1,200 tokens; adding all four should land near 2,500 tokens, well within all five APIs' input windows.
3. Run a single-model dry run via `python scripts/generate.py --date YYYY-MM-DD --model claude --dry-run` (the existing dry-run flag) and inspect the prompt the Advisor would receive.
4. Diff the resulting predictions against a control run from the day before to confirm the panel is responding to the new context, not ignoring it.

---

## Documentation Updates Required After Shipping

- `CLAUDE.md` — list the new modules under Project Structure, add the two new secrets to the Secrets Required block.
- `README.md` — extend the Setup section to include the two new keys.
- `PROMPT.md` — note that the prompt now arrives with calendar, crypto, energy, and positioning blocks appended.
- `docs/report_plan.md` — already references the expanded data layer in §6.1 once this ships.
- `docs/presentation_plan.md` — Slide 4 pipeline diagram should reflect the four new sources.

---

*End of plan.*
