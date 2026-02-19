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
