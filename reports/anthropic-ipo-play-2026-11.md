# Anthropic IPO Play: What the Models Said

**Asked:** Sunday, November 15, 2026. Prices are from the Friday, Nov 13 close.
**Question:** What US stock or ETF (not Anthropic itself) should I buy to profit from the Anthropic IPO over the next week, and when should I buy and sell it?
**Answered:** All 9 models, each using its own live web search. Kimi K3.1 Pro and Qwen 3.8 Max ran out of output tokens and OpenRouter credit on the first run. They were re-run with a 32,000-token limit after the credits were topped up. Total cost: $2.09.
**Full answers:** [`anthropic-ipo-play-2026-11/`](anthropic-ipo-play-2026-11/), with one file per model plus `answers.json`.

> Not financial advice. This is a summary of AI model research. The models in this project have not yet shown a proven trading edge (see the caveat at the end).

---

## The event (verified)

| | |
|---|---|
| IPO pricing | On or about **Wednesday, Nov 18** (evening, New York) |
| First trade | **Thursday, Nov 19** on Nasdaq, ticker **ANT** |
| Offering | 825M shares at **$70–$78**, valuing Anthropic at up to about $1.4T |
| Demand | Reportedly about 6× oversubscribed; bankers weighing pricing above the range |
| Also this week | **Nvidia earnings, Tue Nov 17 after the close.** Options imply about a ±10% move. This is the first report since the CEO resigned. |
| Also this week | **Zoom earnings, Mon Nov 23** |

---

## Bottom line

**Amazon (AMZN) is the clear majority pick.** Five of nine models picked it outright, two more named it as their runner-up, and only two left it out entirely.

| | |
|---|---|
| Buy | **Mon Nov 16, about 9:40–10:00 AM ET**, limit order at or below **$268**. Let the opening auction settle first. Skip if AMZN is already more than about 3% above Friday's $266.66 close. |
| Sell | **Thu Nov 19, ANT's first trading day.** Three of the five Amazon pickers chose this. Kimi's version: sell about 15 minutes after ANT's first trade, no later than 1:00 PM, or at 9:35 AM if AMZN gaps up 3% or more that morning. Claude and Qwen say sell around 3:45 PM. GPT is the holdout: Wed Nov 18 at 9:55 AM, before pricing is published. |
| Target / stop | about **$274–276** (+2.7% to +3.5%) / about **$259** (−2% to −3%) |
| Odds | **52–56%** profitable across Claude, GPT, Qwen and Kimi. That is a coin flip with a slight tilt. Several of them said to keep the position small or skip it. |

Why the expected move is small: Amazon's Anthropic stake is worth about 5–9% of Amazon's $2.88T market value. A 20% pop in ANT therefore adds only about 1% to Amazon's value. That is less than an ordinary day's movement in the stock.

**The bigger swing, Zoom (ZM)** (Gemini, 76% confidence): the stake is a much larger share of the company, so a strong ANT debut moves it more. Buy Mon Nov 16 at 9:35–9:45 AM. Sell **Fri Nov 20 by 3:45 PM**, before Zoom's Monday earnings. Target $109 (+9%), stop $94 (−6%). The catch is that ZM is **already up 11% in the past five days**.

---

## Every pick

| Model | Pick | Buy | Sell | Target / Stop | Confidence | Runner-up |
|---|---|---|---|---|---|---|
| Claude Sonnet 5.5 | **AMZN** $266.66 | Mon 16, 10:00 AM (limit) | Thu 19, 3:45 PM | $274 / $259 | 52% | GOOGL |
| GPT-5.6 Terra | **AMZN** $266.66 | Mon 16, 9:40 AM (limit ≤ $268) | Wed 18, 9:55 AM | $273.50 / $259.75 | 53% | GOOGL |
| Kimi K3.1 Pro | **AMZN** | Mon 16, 10:00 AM (skip if > +3%) | Thu 19, 15 min after ANT opens, by 1:00 PM | +4% / −3% from fill | 56% | GOOGL |
| Qwen 3.8 Max | **AMZN** | Mon 16, 9:30 open | Thu 19, 3:45 PM | +3.5% / −2% from fill | 55% | GOOGL |
| Hermes 4 405B | **AMZN** *(used a wrong $200 price)* | Mon 16, open | Fri 20, near close | n/a (its prices are wrong) | 65% | GOOGL |
| Perplexity Sonar Pro | **GOOGL** $295.77 | Mon 16, 9:30 open | Thu 19, 3:55 PM, or earlier at +4% | none given | 55% | NVDA |
| Gemini 3.8 Flash | **ZM** $99.80 | Mon 16, 9:35 AM | Fri 20, 3:45 PM | $109 / $94 | 76% | AMZN |
| Grok 4.3 | **LAZR** (ETF) $29.25 | Mon 16, open | Fri 20, close (latest Mon 23) | $32 / $26.50 | 60% | NVDA |
| DeepSeek V4 Pro | **HOOD** $77.86 | Mon 16, 9:30 | Mon 23, 4:00 PM | none given | 70% | AMZN |

**All 9 models agree on buying Monday, Nov 16.** Sell timing is where they split, though Thursday is now the most common answer:

| Sell window | Models | Reasoning |
|---|---|---|
| **Wed 18, before pricing** | GPT | Take the run-up and avoid the all-or-nothing pricing outcome. Once the price is known, the news has happened. |
| **Thu 19, ANT's first day** | Claude, Perplexity, Kimi, Qwen | Amazon's or Alphabet's stake gets valued at a real market price that day. After that there is no new catalyst, only sell-the-news risk. Some Anthropic employees can sell on day one, and the $26B private-placement shares have no lock-up, so selling pressure can follow. |
| **Fri 20, near close** | Gemini, Grok, Hermes | Hype around mega-listings like SpaceX peaked in the first 24–36 hours of trading. For Zoom, also avoids its Monday earnings. |
| **Mon 23, close** | DeepSeek | SpaceX peaked on its third trading day, which would be Monday here. |

---

## Fact check (claims I verified)

| Claim | Verdict |
|---|---|
| Amazon's stake is the largest | ✅ About 10.7% of Anthropic (19.3% including convertible notes), worth about $134–272B in the IPO range. Ownership is capped at 12%. |
| Alphabet's stake | ✅ About 9.9%, worth about $126–139B. That is only about 3.5–4% of Alphabet's $3.64T value. |
| Zoom's stake is worth over 15% of Zoom | ⚠️ Close. Bloomberg reported it at **$3.13B** (July), and FourWeekMBA estimates about $3.9B at the range midpoint. That is about **13%** of Zoom's $29B market value, and higher if ANT pops. Zoom's Nov 23 earnings date is confirmed. |
| LAZR holds about 10.5% Anthropic | ✅ Per Tema's Oct 27 release. **But** the fund already values the stake at about $1.4T, roughly the top of the IPO range. So pricing alone doesn't lift it; it gains only if ANT trades above that. Each 10% ANT rise above the mark adds only about 1% to LAZR. The other 90% of the fund is photonics and AI hardware, down 26% this month along with Nvidia. |
| Robinhood benefits from a 20% retail allocation | ❓ DeepSeek cites CNBC; I didn't verify it. DeepSeek gave no prices. HOOD is down 23% this month. Claude's research found that stocks without an actual stake in SpaceX fell more than 10% when SpaceX began trading. |
| Hermes: AMZN at $200 | ❌ AMZN is at $266.66, so Hermes' target and stop can't be used. |

---

## Risks every model flagged

1. **Buy the rumor, sell the news.** The IPO, its price range and the backers' stakes are all public, and Amazon has already raised the book value of its stake by about $63B this year.
2. **Nvidia earnings Tuesday night.** A roughly ±10% move in Nvidia could swing AI stocks more than the IPO itself. *Note: no model suggested exiting before Nvidia reports. The only way to avoid that risk is to sell Tuesday before 4 PM, which also means selling before the IPO prices.*
3. **The stake is small relative to the company.** For Amazon and Alphabet, normal daily movement is larger than the Anthropic effect.
4. **A weak debut hurts twice.** A flat or negative ANT opening would hit both the value of the stake and AI sentiment in general.
5. **Macro.** The 10-year yield is above 5.1%, Nvidia has fallen six weeks in a row, and the Nasdaq dropped about 2% on Friday.

---

## My read

- The consensus trade is **AMZN: buy Monday after the open (limit at or below $268), sell Thursday Nov 19 once ANT has opened, stop at $259**. Expect small gains and treat it as a coin flip. With Kimi and Qwen included, more than half the panel landed on the same stock and the same exit day.
- If you want more sensitivity to the IPO, **ZM** is the strongest case among the higher-swing picks, because its stake is about 13% of its market value. Exit by Friday's close because of Monday's earnings. Its 11% rise this week means some of the move may already have happened.
- Nobody can know the most profitable sell time in advance. The two models with the most rigorous research both said so, and both suggested keeping the position small or skipping the trade.
- **Track-record caveat:** in this project's own paper simulator, the consensus picks were roughly break-even over 11 trades. Most of the gains came from moves that had already happened before the models were asked. The models have not yet shown an edge.
- **Disclosure:** I'm Claude, built by Anthropic. I've stuck to what the models and the sources say, but weigh my commentary on an Anthropic-related trade with that in mind.

---

## Sources I checked

- [Anthropic Sets IPO Price Range at $70 to $78 (Yahoo Finance)](https://finance.yahoo.com/markets/stocks/articles/anthropic-sets-ipo-price-range-140602411.html)
- [Anthropic IPO Price Range $70–$78: S-1/A, Valuation and Date](https://decodethefuture.org/en/anthropic-s1-ipo-filing-explained/)
- [Nvidia's first post-Jensen earnings and Anthropic's IPO: What to watch this week (Yahoo Finance)](https://finance.yahoo.com/markets/article/nvidias-first-post-jensen-earnings-and-anthropics-ipo-what-to-watch-this-week-110000732.html)
- [Anthropic IPO: Can ANT Price Above $78 After Orders Reach Six Times the Shares? (TradingKey)](https://www.tradingkey.com/analysis/stocks/us-stocks/262304476-anthropic-ipo-ant-price-above-78-orders-six-times-november-14-2026-tradingkey)
- [Anthropic IPO Date, Price Range and Valuation: What Polymarket Expects (Finextra)](https://www.finextra.com/blogposting/33468/anthropic-ipo-date-price-range-and-valuation-what-polymarket-expects-for-ant)
- [Zoom's Anthropic Stake Grows to $3 Billion in Value (Bloomberg)](https://www.bloomberg.com/news/articles/2026-08-26/zoom-s-anthropic-stake-grows-to-3-billion-in-value-after-gains)
- [Spark $9.2B, Zoom $3.9B: Anthropic Backers at IPO Midpoint (FourWeekMBA)](https://fourweekmba.com/ai-spark-9-2b-zoom-3-9b-anthropic-backers-at-ipo-midpoint/)
- [LAZR ETF Increases Anthropic Holding to 10.5% (Tema ETFs)](https://temaetfs.com/press/lazr-etf-increases-anthropic-holding-to-10.5-the-highest-of-any-etf-tema-etfs)
- [Anthropic IPO: What It Means For Amazon, Google And Nvidia Stock (Trefis)](https://www.trefis.com/stock/amzn/articles/624613/anthropic-ipo-what-it-means-for-amazon-google-and-nvidia-stock/2026-11-12)
- [NVDA Earnings November 2026: Nov 17, ±10.8% Implied Move (Earnings Watcher)](https://earnings-watcher.com/wiki/nvda-earnings-november-2026)
- Live prices and earnings dates: Yahoo Finance via yfinance, Nov 15, 2026

Each model's own citations, including the SEC filings GPT quoted, are listed at the bottom of its file in [`anthropic-ipo-play-2026-11/`](anthropic-ipo-play-2026-11/).
