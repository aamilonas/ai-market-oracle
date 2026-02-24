"""Shared utilities: schema validation, logging, file helpers."""

import json
import logging
import os
import re
from datetime import date, datetime, timezone, timedelta
from pathlib import Path
from typing import Any

# US Eastern offset: UTC-5 (EST) or UTC-4 (EDT).
# Python 3.9+ has zoneinfo, but keep it simple with a fixed check.
def today_et() -> date:
    """Return today's date in US Eastern time."""
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("America/New_York")).date()
    except ImportError:
        # Fallback: assume EST (UTC-5) — close enough for market scripts
        return datetime.now(timezone(timedelta(hours=-5))).date()


# ── Paths ──────────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).parent.parent
DATA_DIR = REPO_ROOT / "data"
PREDICTIONS_DIR = DATA_DIR / "predictions"
SCORES_DIR = DATA_DIR / "scores"
SUMMARIES_DAILY_DIR = DATA_DIR / "summaries" / "daily"
SUMMARIES_WEEKLY_DIR = DATA_DIR / "summaries" / "weekly"
LEADERBOARD_FILE = DATA_DIR / "leaderboard.json"
PUBLIC_DATA_DIR = REPO_ROOT / "public" / "data"


def ensure_dirs():
    for d in [
        PREDICTIONS_DIR, SCORES_DIR,
        SUMMARIES_DAILY_DIR, SUMMARIES_WEEKLY_DIR,
    ]:
        d.mkdir(parents=True, exist_ok=True)


# ── Logging ────────────────────────────────────────────────────────────────────
def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            "%(asctime)s %(levelname)s [%(name)s] %(message)s",
            "%H:%M:%S",
        ))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger


# ── JSON helpers ───────────────────────────────────────────────────────────────
def load_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Any, indent: int = 2):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)


def sync_to_public(src: Path):
    """Mirror a data file to the public/ folder so Vite serves it at runtime."""
    rel = src.relative_to(DATA_DIR)
    dst = PUBLIC_DATA_DIR / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    import shutil
    shutil.copy2(src, dst)


# ── Schema validation ──────────────────────────────────────────────────────────
ALLOWED_TIMEFRAMES = {"end_of_day", "end_of_week", "end_of_month"}
ALLOWED_DIRECTIONS = {"up", "down"}
MAJOR_INDICES = {"SPY", "QQQ", "DIA"}


def validate_prediction_payload(payload: dict, date_str: str, model_id: str) -> list[str]:
    """Return a list of validation errors (empty = valid)."""
    errors = []

    required_top = ["date", "model", "model_display_name", "generated_at", "market_context", "predictions"]
    for k in required_top:
        if k not in payload:
            errors.append(f"Missing top-level key: {k}")

    preds = payload.get("predictions", [])
    if not isinstance(preds, list):
        errors.append("'predictions' must be a list")
        return errors

    if len(preds) < 3:
        errors.append(f"Need at least 3 predictions, got {len(preds)}")
    if len(preds) > 5:
        errors.append(f"Too many predictions: {len(preds)} (max 5)")

    tickers = [p.get("ticker", "") for p in preds]
    if not any(t in MAJOR_INDICES for t in tickers):
        errors.append("At least one prediction must be on SPY, QQQ, or DIA")

    for i, pred in enumerate(preds):
        prefix = f"predictions[{i}]"
        for k in ["id", "ticker", "prediction_type", "direction", "target_price",
                  "current_price_at_prediction", "timeframe", "confidence", "reasoning"]:
            if k not in pred:
                errors.append(f"{prefix}: missing key '{k}'")

        if pred.get("direction") not in ALLOWED_DIRECTIONS:
            errors.append(f"{prefix}: invalid direction '{pred.get('direction')}'")

        if pred.get("timeframe") not in ALLOWED_TIMEFRAMES:
            errors.append(f"{prefix}: invalid timeframe '{pred.get('timeframe')}'")

        conf = pred.get("confidence")
        if conf is not None:
            try:
                conf = float(conf)
                if not (0.50 <= conf <= 0.95):
                    errors.append(f"{prefix}: confidence {conf} out of range [0.50, 0.95]")
            except (TypeError, ValueError):
                errors.append(f"{prefix}: confidence must be a number")

        for price_key in ["target_price", "current_price_at_prediction"]:
            v = pred.get(price_key)
            if v is not None:
                try:
                    float(v)
                except (TypeError, ValueError):
                    errors.append(f"{prefix}: {price_key} must be a number")

    return errors


def extract_json_from_text(text: str) -> dict | None:
    """Try to extract a JSON object from text that may contain extra content."""
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try to extract JSON block from markdown
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find first { ... } block
    start = text.find("{")
    if start != -1:
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i+1])
                    except json.JSONDecodeError:
                        break

    return None


# ── Market calendar ─────────────────────────────────────────────────────────────
US_HOLIDAYS_2025 = {
    date(2025, 1, 1),   # New Year's Day
    date(2025, 1, 20),  # MLK Day
    date(2025, 2, 17),  # Presidents' Day
    date(2025, 4, 18),  # Good Friday
    date(2025, 5, 26),  # Memorial Day
    date(2025, 6, 19),  # Juneteenth
    date(2025, 7, 4),   # Independence Day
    date(2025, 9, 1),   # Labor Day
    date(2025, 11, 27), # Thanksgiving
    date(2025, 11, 28), # Day after Thanksgiving (half day, skip)
    date(2025, 12, 25), # Christmas
}

US_HOLIDAYS_2026 = {
    date(2026, 1, 1),   # New Year's Day
    date(2026, 1, 19),  # MLK Day
    date(2026, 2, 16),  # Presidents' Day
    date(2026, 4, 3),   # Good Friday
    date(2026, 5, 25),  # Memorial Day
    date(2026, 6, 19),  # Juneteenth
    date(2026, 7, 3),   # Independence Day (observed)
    date(2026, 9, 7),   # Labor Day
    date(2026, 11, 26), # Thanksgiving
    date(2026, 12, 25), # Christmas
}

US_MARKET_HOLIDAYS = US_HOLIDAYS_2025 | US_HOLIDAYS_2026


def is_market_open(d: date | None = None) -> bool:
    """Return True if the US stock market is open on the given date."""
    if d is None:
        d = today_et()
    if d.weekday() >= 5:  # Saturday or Sunday
        return False
    return d not in US_MARKET_HOLIDAYS
