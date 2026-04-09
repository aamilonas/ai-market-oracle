"""Fetch macro-economic indicators from the FRED API (Federal Reserve Economic Data)."""

import os
from typing import Optional

import requests

from utils import get_logger

log = get_logger("fred_data")

FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"

# Key economic indicators and their human-readable names
INDICATORS = {
    "DGS10": "10-Year Treasury Yield",
    "DGS2": "2-Year Treasury Yield",
    "FEDFUNDS": "Fed Funds Rate",
    "CPIAUCSL": "CPI (Consumer Price Index)",
    "UNRATE": "Unemployment Rate",
    "T10Y2Y": "10Y-2Y Yield Spread",
}


def _fetch_latest(series_id: str, api_key: str) -> Optional[str]:
    """Fetch the most recent observation for a FRED series."""
    try:
        resp = requests.get(
            FRED_BASE,
            params={
                "series_id": series_id,
                "api_key": api_key,
                "file_type": "json",
                "limit": 1,
                "sort_order": "desc",
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        observations = data.get("observations", [])
        if observations:
            value = observations[0].get("value", ".")
            date = observations[0].get("date", "")
            if value != ".":
                return f"{value} (as of {date})"
    except Exception as e:
        log.warning(f"FRED fetch failed for {series_id}: {e}")
    return None


def get_fred_context() -> str:
    """
    Fetch key macro indicators from FRED and return a formatted text block.
    Returns empty string if FRED_API_KEY is not set or all fetches fail.
    """
    api_key = os.environ.get("FRED_API_KEY")
    if not api_key:
        log.info("FRED_API_KEY not set — skipping macro data")
        return ""

    log.info("Fetching FRED macro indicators...")
    lines = []
    lines.append("MACRO ECONOMIC INDICATORS (from Federal Reserve / FRED):")

    fetched = 0
    for series_id, name in INDICATORS.items():
        result = _fetch_latest(series_id, api_key)
        if result:
            lines.append(f"  {name}: {result}")
            fetched += 1

    if fetched == 0:
        log.warning("No FRED data retrieved")
        return ""

    log.info(f"FRED context fetched ({fetched}/{len(INDICATORS)} indicators)")
    return "\n".join(lines)
