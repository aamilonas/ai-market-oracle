"""
Evening script: score predictions against actual market closes.
Run at 5:30 PM ET on weekdays after market close.

Usage:
    python score.py [--date YYYY-MM-DD]
"""

import argparse
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent))

from market_data import get_batch_closing_prices
from utils import (
    ensure_dirs,
    get_logger,
    is_market_open,
    load_json,
    save_json,
    sync_to_public,
    PREDICTIONS_DIR,
    SCORES_DIR,
    LEADERBOARD_FILE,
)

log = get_logger("score")


def compute_score(direction_correct: bool, confidence: float, target_accuracy: float) -> float:
    """
    Scoring formula:
    - Direction correct: +1 * confidence
    - Direction wrong: -1 * confidence
    - Bonus: +0.5 if actual close within 1% of target price
    """
    base = confidence if direction_correct else -confidence
    bonus = 0.5 if (target_accuracy >= 0.99) and direction_correct else 0.0
    return round(base + bonus, 4)


def score_date(date_str: str) -> Optional[dict]:
    ensure_dirs()

    # Check if already scored
    out_file = SCORES_DIR / f"{date_str}.json"
    existing_data = None
    existing_ids = set()
    if out_file.exists():
        existing_data = load_json(out_file)
        existing_ids = {r["prediction_id"] for r in existing_data.get("results", [])}
        log.info(f"Existing scores found for {date_str}, will add unscored predictions")

    pred_dir = PREDICTIONS_DIR / date_str
    if not pred_dir.exists():
        log.error(f"No predictions directory for {date_str}")
        return None

    pred_files = list(pred_dir.glob("*.json"))
    if not pred_files:
        log.error(f"No prediction files in {pred_dir}")
        return None

    # Collect all end-of-day predictions that need scoring today
    to_score = []
    for pf in pred_files:
        try:
            data = load_json(pf)
        except Exception as e:
            log.error(f"Could not load {pf}: {e}")
            continue

        for pred in data.get("predictions", []):
            pid = pred["id"]
            if pid in existing_ids:
                continue
            if pred.get("timeframe") != "end_of_day":
                # End-of-week/month predictions scored on their respective day
                log.info(f"Skipping {pid} (timeframe: {pred.get('timeframe')})")
                continue
            to_score.append({
                "prediction": pred,
                "model": data["model"],
                "model_display_name": data["model_display_name"],
            })

    if not to_score:
        log.info(f"No new end_of_day predictions to score for {date_str}")
        return existing_data

    # Fetch closing prices
    tickers = list({item["prediction"]["ticker"] for item in to_score})
    log.info(f"Fetching closing prices for: {tickers}")
    d = datetime.strptime(date_str, "%Y-%m-%d").date()
    closes = get_batch_closing_prices(tickers, d)

    results = list(existing_data.get("results", []) if existing_data else [])

    for item in to_score:
        pred = item["prediction"]
        ticker = pred["ticker"]
        actual_close = closes.get(ticker)

        if actual_close is None:
            log.warning(f"No closing price for {ticker} — marking as unresolved")
            results.append({
                "prediction_id": pred["id"],
                "model": item["model"],
                "model_display_name": item["model_display_name"],
                "ticker": ticker,
                "predicted_direction": pred["direction"],
                "predicted_target": pred["target_price"],
                "actual_close": None,
                "actual_direction": None,
                "direction_correct": None,
                "target_accuracy": None,
                "confidence_at_prediction": pred["confidence"],
                "score": 0.0,
                "status": "unresolved",
            })
            continue

        entry_price = pred["current_price_at_prediction"]
        actual_direction = "up" if actual_close >= entry_price else "down"
        direction_correct = actual_direction == pred["direction"]
        target_accuracy = round(
            1 - abs(actual_close - pred["target_price"]) / pred["target_price"], 4
        )
        score = compute_score(direction_correct, pred["confidence"], target_accuracy)

        results.append({
            "prediction_id": pred["id"],
            "model": item["model"],
            "model_display_name": item["model_display_name"],
            "ticker": ticker,
            "predicted_direction": pred["direction"],
            "predicted_target": pred["target_price"],
            "actual_close": actual_close,
            "actual_direction": actual_direction,
            "direction_correct": direction_correct,
            "target_accuracy": target_accuracy,
            "confidence_at_prediction": pred["confidence"],
            "score": score,
            "status": "resolved",
        })
        log.info(
            f"{item['model_display_name']} {ticker}: "
            f"predicted {pred['direction']}, actual {actual_direction} "
            f"({'✓' if direction_correct else '✗'}) score={score:+.2f}"
        )

    score_data = {
        "date": date_str,
        "scored_at": datetime.utcnow().isoformat() + "Z",
        "results": results,
    }

    save_json(out_file, score_data)
    sync_to_public(out_file)
    log.info(f"Saved {len(results)} scored results to {out_file}")
    return score_data


def update_leaderboard(score_data: dict):
    """Update the running leaderboard with new scores."""
    if not LEADERBOARD_FILE.exists():
        log.error(f"Leaderboard file not found: {LEADERBOARD_FILE}")
        return

    lb = load_json(LEADERBOARD_FILE)
    model_map = {m["model_display_name"]: m for m in lb["models"]}

    # Only process newly resolved results
    for result in score_data.get("results", []):
        if result["status"] != "resolved":
            continue

        name = result["model_display_name"]
        if name not in model_map:
            log.warning(f"Unknown model in scores: {name}")
            continue

        m = model_map[name]
        # Update totals
        m["total_predictions"] = m.get("total_predictions", 0) + 1
        if result["direction_correct"]:
            m["correct_directions"] = m.get("correct_directions", 0) + 1
        m["total_score"] = round(m.get("total_score", 0.0) + result["score"], 4)

        # Recompute accuracy
        if m["total_predictions"] > 0:
            m["direction_accuracy"] = round(
                m["correct_directions"] / m["total_predictions"], 4
            )

        # Update streak
        streak = m.get("current_streak", 0)
        if result["direction_correct"]:
            m["current_streak"] = max(1, streak + 1) if streak >= 0 else 1
        else:
            m["current_streak"] = min(-1, streak - 1) if streak <= 0 else -1

        m["best_streak"] = max(m.get("best_streak", 0), m["current_streak"])
        m["worst_streak"] = min(m.get("worst_streak", 0), m["current_streak"])

    lb["last_updated"] = datetime.utcnow().isoformat() + "Z"
    save_json(LEADERBOARD_FILE, lb)
    sync_to_public(LEADERBOARD_FILE)
    log.info("Leaderboard updated")


def main():
    parser = argparse.ArgumentParser(description="Score AI market predictions")
    parser.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="Date to score (YYYY-MM-DD, default: today)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip market holiday check",
    )
    args = parser.parse_args()

    if not args.force:
        from datetime import datetime as dt
        d = dt.strptime(args.date, "%Y-%m-%d").date()
        if not is_market_open(d):
            log.info(f"{args.date} is not a market day — exiting")
            sys.exit(0)

    score_data = score_date(args.date)
    if score_data:
        update_leaderboard(score_data)


if __name__ == "__main__":
    main()
