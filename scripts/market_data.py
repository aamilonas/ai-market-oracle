"""Fetch actual market closing prices via yfinance."""

import time
from datetime import date, datetime, timedelta
from typing import Optional

import yfinance as yf

from utils import get_logger

log = get_logger("market_data")

YFINANCE_TICKER_ALIASES = {
    "VIX": "^VIX",
}

# Tickers included in the shared prompt context. Every model sees all of these,
# so anything models predict on regularly belongs here.
CONTEXT_INDICES = ["SPY", "QQQ", "DIA", "IWM"]
CONTEXT_STOCKS = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META"]
CONTEXT_INDICATORS = ["^VIX", "^TNX"]
CONTEXT_CRYPTO = ["BTC-USD", "ETH-USD"]


def get_closing_price(ticker: str, target_date: date, retries: int = 3) -> Optional[float]:
    """
    Fetch the closing price for a ticker on a specific date.
    Returns None if data is unavailable.
    """
    # yfinance needs a day window; fetch a few days in case of holiday adjustments
    start = target_date - timedelta(days=3)
    end = target_date + timedelta(days=1)

    for attempt in range(retries):
        try:
            yf_ticker = YFINANCE_TICKER_ALIASES.get(ticker, ticker)
            ticker_obj = yf.Ticker(yf_ticker)
            hist = ticker_obj.history(start=start.isoformat(), end=end.isoformat())

            if hist.empty:
                log.warning(f"No data for {ticker} ({yf_ticker}) around {target_date}")
                return None

            # Find the row matching the target date
            for idx in hist.index:
                idx_date = idx.date() if hasattr(idx, "date") else idx
                if idx_date == target_date:
                    close = float(hist.loc[idx, "Close"])
                    log.info(f"{ticker} close on {target_date}: ${close:.2f}")
                    return round(close, 2)

            # If exact date not found, take the last available row (for half-days etc.)
            close = float(hist["Close"].iloc[-1])
            actual_date = hist.index[-1].date() if hasattr(hist.index[-1], "date") else hist.index[-1]
            log.warning(
                f"{ticker} ({yf_ticker}): no data for {target_date}, "
                f"using {actual_date} close ${close:.2f}"
            )
            return round(close, 2)

        except Exception as e:
            log.error(f"yfinance error for {ticker} (attempt {attempt + 1}): {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)

    return None


def get_batch_closing_prices(tickers: list[str], target_date: date) -> dict[str, Optional[float]]:
    """Fetch closing prices for multiple tickers. Returns dict of ticker -> price."""
    results = {}
    seen = set()
    for ticker in tickers:
        if ticker in seen:
            continue
        seen.add(ticker)
        results[ticker] = get_closing_price(ticker, target_date)
        time.sleep(0.3)  # Gentle rate limiting
    return results


def _session_state(now_et) -> str:
    """Where we are in the trading day: "pre", "open", "post" or "closed"."""
    from utils import is_market_open
    if not is_market_open(now_et.date()):
        return "closed"
    minutes = now_et.hour * 60 + now_et.minute
    if minutes < 9 * 60 + 30:
        return "pre"
    if minutes <= 16 * 60:
        return "open"
    return "post"


def _earnings_note(ticker: str, trading_day: date) -> Optional[str]:
    """Flag earnings within a day either side of the trading date, with consensus EPS.

    A gap-down on earnings is the single easiest way for a model to misread a
    price, so it is worth one extra call per ticker to say so explicitly.
    """
    try:
        cal = yf.Ticker(YFINANCE_TICKER_ALIASES.get(ticker, ticker)).calendar or {}
    except Exception as e:
        log.warning(f"No calendar for {ticker}: {e}")
        return None

    dates = cal.get("Earnings Date") or []
    if not isinstance(dates, list):
        dates = [dates]
    for d in dates:
        if not isinstance(d, date):
            continue
        delta = (d - trading_day).days
        if abs(delta) > 1:
            continue
        when = {-1: "reported yesterday", 0: "reports today", 1: "reports tomorrow"}[delta]
        eps = cal.get("Earnings Average")
        eps_str = f", consensus EPS ${eps:.2f}" if isinstance(eps, (int, float)) else ""
        return f"{when} ({d.isoformat()}){eps_str}"
    return None


def get_market_snapshot(trading_day: Optional[date] = None) -> dict:
    """One Yahoo Finance snapshot, shared by every model and used as the scoring baseline.

    Returns {"fetched_at", "session", "quotes": {ticker: {...}}}. Taking this once
    (rather than per model, per ticker) is what makes the baseline identical for
    everyone and makes the number in the prompt the number we score against.
    """
    from zoneinfo import ZoneInfo
    now_et = datetime.now(ZoneInfo("America/New_York"))
    trading_day = trading_day or now_et.date()

    tickers = CONTEXT_INDICES + CONTEXT_STOCKS + CONTEXT_INDICATORS + CONTEXT_CRYPTO
    log.info(f"Fetching market snapshot for {len(tickers)} tickers...")
    try:
        data = yf.download(tickers, period="10d", progress=False, group_by="ticker")
    except Exception as e:
        log.error(f"Failed to fetch market snapshot: {e}")
        return {"fetched_at": now_et.isoformat(), "session": _session_state(now_et), "quotes": {}}

    quotes = {}
    for ticker in tickers:
        try:
            frame = data[ticker] if len(tickers) > 1 else data
            closes = frame["Close"].dropna()
            if closes.empty:
                continue

            last_idx = closes.index[-1]
            last_date = last_idx.date() if hasattr(last_idx, "date") else last_idx
            is_today = last_date == trading_day
            last = round(float(closes.iloc[-1]), 2)

            # Intraday, the latest bar is today's in-progress bar and the row before
            # it is the previous close. Outside the session the latest bar is itself a
            # close, so the row before it is the prior day's close.
            prev_close = round(float(closes.iloc[-2]), 2) if len(closes) >= 2 else None

            quote = {
                "last": last,
                "prev_close": prev_close,
                "is_intraday": bool(is_today),
                "as_of_date": last_date.isoformat() if hasattr(last_date, "isoformat") else str(last_date),
            }
            if prev_close:
                quote["pct_today"] = round((last - prev_close) / prev_close * 100, 2)
            if is_today:
                for src, dst in (("Open", "open"), ("High", "high"), ("Low", "low")):
                    try:
                        value = float(frame[src].dropna().iloc[-1])
                        quote[dst] = round(value, 2)
                    except Exception:
                        pass
            window = closes.iloc[-6:] if len(closes) >= 6 else closes
            first = float(window.iloc[0])
            if first:
                quote["pct_5d"] = round((last - first) / first * 100, 2)
            quotes[ticker] = quote
        except Exception as e:
            log.warning(f"Could not build snapshot for {ticker}: {e}")

    for ticker in CONTEXT_STOCKS:
        if ticker in quotes:
            note = _earnings_note(ticker, trading_day)
            if note:
                quotes[ticker]["earnings"] = note

    log.info(f"Snapshot built for {len(quotes)}/{len(tickers)} tickers")
    return {
        "fetched_at": now_et.isoformat(),
        "session": _session_state(now_et),
        "trading_day": trading_day.isoformat(),
        "quotes": quotes,
    }


def _price_line(label: str, q: dict, money: str = "$") -> str:
    """One ticker, with the live price and the previous close side by side."""
    parts = [f"{label}: {money}{q['last']:,.2f}"]
    if q.get("prev_close") is not None:
        if q.get("is_intraday") and q.get("pct_today") is not None:
            parts.append(f"prev close {money}{q['prev_close']:,.2f}")
            parts.append(f"{q['pct_today']:+.2f}% today")
        elif q.get("pct_today") is not None:
            parts.append(f"prior close {money}{q['prev_close']:,.2f} ({q['pct_today']:+.2f}%)")
    if q.get("is_intraday") and q.get("low") is not None and q.get("high") is not None:
        parts.append(f"day range {money}{q['low']:,.2f}-{money}{q['high']:,.2f}")
    if q.get("pct_5d") is not None:
        parts.append(f"5-day {q['pct_5d']:+.1f}%")
    return "  " + "  |  ".join(parts)


def format_market_context(snapshot: dict) -> str:
    """Render the snapshot for the prompt, labelling every price for what it is."""
    quotes = snapshot.get("quotes") or {}
    if not quotes:
        return ""

    session = snapshot.get("session")
    stamp = snapshot.get("fetched_at", "")[11:16]
    intraday = any(q.get("is_intraday") for q in quotes.values())

    if session == "open":
        headline = f"=== MARKET DATA (Yahoo Finance live snapshot, {stamp} ET — market OPEN) ==="
        caveat = (
            "The first price on each line is the LIVE intraday price at the moment of this\n"
            "snapshot, NOT a previous close. The previous close is given separately so you can\n"
            "see how far today has already moved. Any gap or news-driven drop earlier today is\n"
            "ALREADY reflected in the live price — do not subtract it again."
        )
    elif session == "pre":
        headline = f"=== MARKET DATA (Yahoo Finance, {stamp} ET — PRE-MARKET, regular session not yet open) ==="
        caveat = "Prices are the most recent regular-session closes. Today's session has not started."
    else:
        headline = f"=== MARKET DATA (Yahoo Finance, {stamp} ET — market closed) ==="
        caveat = "Prices are the most recent available closes."

    lines = [headline, "", caveat, ""]

    groups = [
        ("INDICES / ETFs", CONTEXT_INDICES, "$"),
        ("KEY STOCKS", CONTEXT_STOCKS, "$"),
        ("CRYPTO (24h market)", CONTEXT_CRYPTO, "$"),
    ]
    for title, tickers, money in groups:
        present = [t for t in tickers if t in quotes]
        if not present:
            continue
        lines.append(f"{title}:")
        lines.extend(_price_line(t, quotes[t], money) for t in present)
        lines.append("")

    lines.append("MARKET INDICATORS:")
    if "^VIX" in quotes:
        q = quotes["^VIX"]
        extra = f"  ({q['pct_today']:+.2f}% today)" if q.get("pct_today") is not None else ""
        lines.append(f"  VIX: {q['last']:.2f}{extra}")
    if "^TNX" in quotes:
        lines.append(f"  10Y Treasury Yield: {quotes['^TNX']['last']:.2f}%")
    lines.append("")

    earnings = [(t, quotes[t]["earnings"]) for t in CONTEXT_STOCKS if quotes.get(t, {}).get("earnings")]
    if earnings:
        lines.append("EARNINGS IN THIS WINDOW:")
        lines.extend(f"  {t}: {note}" for t, note in earnings)
        lines.append("")

    if intraday and session == "open":
        lines.append(
            "These live prices are the baseline your direction is scored against. "
            "Predict where each ticker closes at 4:00 PM ET relative to the live price above."
        )
    else:
        lines.append("Use these as your reference prices; do not invent prices.")
    lines.append("===")
    return "\n".join(lines)


def get_market_context() -> str:
    """Backwards-compatible wrapper: snapshot and render in one call."""
    return format_market_context(get_market_snapshot())


def get_current_price(ticker: str) -> Optional[float]:
    """Get the most recent price (for use at prediction time to fill current_price)."""
    try:
        t = yf.Ticker(YFINANCE_TICKER_ALIASES.get(ticker, ticker))
        info = t.fast_info
        price = info.last_price
        if price and price > 0:
            return round(float(price), 2)
    except Exception as e:
        log.error(f"Could not get current price for {ticker}: {e}")
    return None


def get_open_price(ticker: str, target_date: date, retries: int = 3) -> Optional[float]:
    """
    Fetch the regular-session opening price (9:30 ET) for a ticker on a specific date.
    Used as the honest, reproducible entry price for paper trades.
    """
    start = target_date - timedelta(days=3)
    end = target_date + timedelta(days=2)

    for attempt in range(retries):
        try:
            yf_ticker = YFINANCE_TICKER_ALIASES.get(ticker, ticker)
            ticker_obj = yf.Ticker(yf_ticker)
            hist = ticker_obj.history(start=start.isoformat(), end=end.isoformat())

            if hist.empty:
                log.warning(f"No data for {ticker} ({yf_ticker}) around {target_date}")
                return None

            for idx in hist.index:
                idx_date = idx.date() if hasattr(idx, "date") else idx
                if idx_date == target_date:
                    open_px = float(hist.loc[idx, "Open"])
                    log.info(f"{ticker} open on {target_date}: ${open_px:.2f}")
                    return round(open_px, 2)

            log.warning(f"{ticker} ({yf_ticker}): no open price for {target_date}")
            return None

        except Exception as e:
            log.error(f"yfinance open-price error for {ticker} (attempt {attempt + 1}): {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)

    return None
