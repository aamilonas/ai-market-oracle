"""Fetch actual market closing prices via yfinance."""

import time
from datetime import date, timedelta
from typing import Optional

import yfinance as yf

from utils import get_logger

log = get_logger("market_data")


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
            ticker_obj = yf.Ticker(ticker)
            hist = ticker_obj.history(start=start.isoformat(), end=end.isoformat())

            if hist.empty:
                log.warning(f"No data for {ticker} around {target_date}")
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
            log.warning(f"{ticker}: no data for {target_date}, using {actual_date} close ${close:.2f}")
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


def get_market_context() -> str:
    """
    Fetch standardized market data to inject into prediction prompts.
    Returns a formatted text block with yesterday's closes, 5-day changes,
    VIX, treasury yield, and crypto prices.
    """
    indices = ["SPY", "QQQ", "DIA"]
    stocks = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META"]
    indicators = ["^VIX", "^TNX"]
    crypto = ["BTC-USD", "ETH-USD"]

    all_tickers = indices + stocks + indicators + crypto

    log.info("Fetching market context data...")
    try:
        data = yf.download(all_tickers, period="6d", progress=False, group_by="ticker")
    except Exception as e:
        log.error(f"Failed to fetch market context: {e}")
        return ""

    if data.empty:
        log.warning("Market context download returned empty data")
        return ""

    def _get_latest(ticker):
        """Extract latest close and 5-day % change for a ticker."""
        try:
            if len(all_tickers) == 1:
                col = data
            else:
                col = data[ticker]
            closes = col["Close"].dropna()
            if closes.empty:
                return None, None
            latest = round(float(closes.iloc[-1]), 2)
            if len(closes) >= 2:
                oldest = float(closes.iloc[0])
                pct = round((latest - oldest) / oldest * 100, 2) if oldest else None
            else:
                pct = None
            return latest, pct
        except Exception:
            return None, None

    lines = []
    lines.append("=== MARKET DATA (from Yahoo Finance — use these as your baseline prices) ===")
    lines.append("")

    # Indices
    lines.append("MAJOR INDICES (previous close):")
    for t in indices:
        price, pct = _get_latest(t)
        if price is not None:
            pct_str = f"  (5-day: {pct:+.1f}%)" if pct is not None else ""
            lines.append(f"  {t}: ${price:.2f}{pct_str}")

    # Key stocks
    lines.append("")
    lines.append("KEY STOCKS (previous close):")
    stock_parts = []
    for t in stocks:
        price, _ = _get_latest(t)
        if price is not None:
            stock_parts.append(f"{t}: ${price:.2f}")
    # Format as 3-4 per line
    for i in range(0, len(stock_parts), 3):
        lines.append("  " + "  |  ".join(stock_parts[i:i+3]))

    # Indicators
    lines.append("")
    lines.append("MARKET INDICATORS:")
    vix_price, vix_pct = _get_latest("^VIX")
    if vix_price is not None:
        pct_str = f"  (5-day: {vix_pct:+.1f}%)" if vix_pct is not None else ""
        lines.append(f"  VIX: {vix_price:.2f}{pct_str}")
    tnx_price, _ = _get_latest("^TNX")
    if tnx_price is not None:
        lines.append(f"  10Y Treasury Yield: {tnx_price:.2f}%")

    # Crypto
    lines.append("")
    lines.append("CRYPTO (previous close):")
    for t in crypto:
        price, pct = _get_latest(t)
        if price is not None:
            pct_str = f"  (5-day: {pct:+.1f}%)" if pct is not None else ""
            lines.append(f"  {t}: ${price:,.2f}{pct_str}")

    lines.append("")
    lines.append("IMPORTANT: Use these prices as your 'current_price_at_prediction' values.")
    lines.append("Do NOT hallucinate prices — these are real data from Yahoo Finance.")
    lines.append("===")

    context = "\n".join(lines)
    log.info(f"Market context fetched ({len(lines)} lines)")
    return context


def get_current_price(ticker: str) -> Optional[float]:
    """Get the most recent price (for use at prediction time to fill current_price)."""
    try:
        t = yf.Ticker(ticker)
        info = t.fast_info
        price = info.last_price
        if price and price > 0:
            return round(float(price), 2)
    except Exception as e:
        log.error(f"Could not get current price for {ticker}: {e}")
    return None
