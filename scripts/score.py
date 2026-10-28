"""
Evening script: score predictions against actual market closes.
Run at 5:30 PM ET on weekdays after market close.

Usage:
    python score.py [--date YYYY-MM-DD]
"""

import argparse
import sys
from datetime import date, datetime, timezone
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
    load_models,
    model_lookup,
    sync_to_public,
    today_et,
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
    resolved_ids = set()
    existing_results = []
    if out_file.exists():
        existing_data = load_json(out_file)
        existing_results = existing_data.get("results", [])
        resolved_ids = {
            r["prediction_id"]
            for r in existing_results
            if r.get("status") == "resolved"
        }
        log.info(f"Existing scores found for {date_str}, will add unscored predictions")

    pred_dir = PREDICTIONS_DIR / date_str
    if not pred_dir.exists():
        log.warning(f"No predictions directory for {date_str} — nothing to score")
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
            if pid in resolved_ids:
                continue
            if pred.get("timeframe") != "end_of_day":
                log.info(f"Skipping {pid} (timeframe: {pred.get('timeframe')})")
                continue
            if not pred.get("current_price_at_prediction"):
                log.warning(f"Skipping {pid}: no baseline price")
                continue
            to_score.append({
                "prediction": pred,
                "slug": data.get("slug", pf.stem),
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

    retry_ids = {item["prediction"]["id"] for item in to_score}
    results = [r for r in existing_results if r.get("prediction_id") not in retry_ids]

    for item in to_score:
        pred = item["prediction"]
        ticker = pred["ticker"]
        actual_close = closes.get(ticker)

        if actual_close is None:
            log.warning(f"No closing price for {ticker} — marking as unresolved")
            results.append({
                "prediction_id": pred["id"],
                "slug": item["slug"],
                "model": item["model"],
                "model_display_name": item["model_display_name"],
                "ticker": ticker,
                "predicted_direction": pred["direction"],
                "predicted_target": pred["target_price"],
                "baseline_price": pred["current_price_at_prediction"],
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
        ) if pred["target_price"] != 0 else 0.0
        score = compute_score(direction_correct, pred["confidence"], target_accuracy)

        results.append({
            "prediction_id": pred["id"],
            "slug": item["slug"],
            "model": item["model"],
            "model_display_name": item["model_display_name"],
            "ticker": ticker,
            "predicted_direction": pred["direction"],
            "predicted_target": pred["target_price"],
            "baseline_price": entry_price,
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
        "scored_at": datetime.now(timezone.utc).isoformat(),
        "results": results,
    }

    save_json(out_file, score_data)
    sync_to_public(out_file)
    log.info(f"Saved {len(results)} scored results to {out_file}")
    return score_data


def update_leaderboard(score_data: dict = None):
    """Rebuild the leaderboard from ALL score files (fully idempotent).

    Every active model in models.json gets a row, even before its first
    scored prediction. Rows are keyed by slug, so each exact model version
    keeps its own record. The optional *score_data* argument is accepted for
    call-site compatibility but ignored; all data comes from SCORES_DIR.
    """
    registry = model_lookup()

    # Collect every resolved result with its date for chronological ordering
    entries = []  # list of (date_str, prediction_id, result_dict)
    for sf in sorted(SCORES_DIR.glob("*.json")):
        try:
            data = load_json(sf)
        except Exception as e:
            log.error(f"Could not load {sf}: {e}")
            continue
        date_str = data.get("date", sf.stem)
        for result in data.get("results", []):
            if result.get("status") != "resolved":
                continue
            entries.append((date_str, result.get("prediction_id", ""), result))

    # Sort chronologically (then by prediction_id for stable intra-day order)
    entries.sort(key=lambda e: (e[0], e[1]))

    def new_stats(cfg: dict) -> dict:
        return {
            "slug": cfg["slug"],
            "model_id": cfg["openrouter_model"],
            "model_display_name": cfg["display_name"],
            "active": cfg.get("active", True),
            "total_predictions": 0,
            "correct_directions": 0,
            "direction_accuracy": 0.0,
            "total_score": 0.0,
            "avg_score": 0.0,
            "avg_confidence": 0.0,
            "days_predicted": 0,
            "current_streak": 0,
            "best_streak": 0,
            "worst_streak": 0,
            "weekly_scores": [],
        }

    # Build per-model stats, seeded so every active model has a row
    model_stats = {m["slug"]: new_stats(m) for m in load_models(active_only=True)}
    conf_totals = {slug: 0.0 for slug in model_stats}
    weekly_data = {}   # (slug, "YYYY-WNN") -> {score, preds, correct}

    for date_str, _pid, result in entries:
        cfg = registry.get(result.get("slug")) or registry.get(result.get("model"))
        slug = cfg["slug"] if cfg else result.get("slug") or result["model"]
        if slug not in model_stats:
            # Retired model with history: keep its record, flagged inactive
            model_stats[slug] = new_stats({
                "slug": slug,
                "openrouter_model": result["model"],
                "display_name": result["model_display_name"],
                "active": cfg.get("active", False) if cfg else False,
            })
            conf_totals[slug] = 0.0
        m = model_stats[slug]
        m["total_predictions"] += 1
        if result["direction_correct"]:
            m["correct_directions"] += 1
        m["total_score"] = round(m["total_score"] + result["score"], 4)
        conf_totals[slug] += result.get("confidence_at_prediction", 0.0)

        # Weekly accumulation
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        cal = d.isocalendar()
        week_key = f"{cal[0]}-W{cal[1]:02d}"
        wk = weekly_data.setdefault((slug, week_key), {"score": 0.0, "predictions": 0, "correct": 0})
        wk["score"] = round(wk["score"] + result["score"], 4)
        wk["predictions"] += 1
        if result["direction_correct"]:
            wk["correct"] += 1

        # Streak
        streak = m["current_streak"]
        if result["direction_correct"]:
            m["current_streak"] = max(1, streak + 1) if streak >= 0 else 1
        else:
            m["current_streak"] = min(-1, streak - 1) if streak <= 0 else -1
        m["best_streak"] = max(m["best_streak"], m["current_streak"])
        m["worst_streak"] = min(m["worst_streak"], m["current_streak"])

    # Participation: days each model actually produced a prediction file
    trading_days = sorted(
        d.name for d in PREDICTIONS_DIR.iterdir() if d.is_dir()
    ) if PREDICTIONS_DIR.exists() else []
    for day in trading_days:
        for pf in (PREDICTIONS_DIR / day).glob("*.json"):
            if pf.stem in model_stats:
                model_stats[pf.stem]["days_predicted"] += 1

    # Finalize derived fields
    for slug, m in model_stats.items():
        if m["total_predictions"] > 0:
            m["direction_accuracy"] = round(
                m["correct_directions"] / m["total_predictions"], 4
            )
            m["avg_score"] = round(m["total_score"] / m["total_predictions"], 4)
            m["avg_confidence"] = round(
                conf_totals[slug] / m["total_predictions"], 4
            )

        # Build weekly_scores array sorted chronologically
        m["weekly_scores"] = []
        for (wslug, week_key), wk in sorted(weekly_data.items()):
            if wslug != slug:
                continue
            m["weekly_scores"].append({
                "week": week_key,
                "score": wk["score"],
                "predictions": wk["predictions"],
                "accuracy": round(wk["correct"] / wk["predictions"], 4) if wk["predictions"] else 0.0,
            })

    lb = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "trading_days": len(trading_days),
        "models": list(model_stats.values()),
    }

    save_json(LEADERBOARD_FILE, lb)
    sync_to_public(LEADERBOARD_FILE)
    log.info(f"Leaderboard rebuilt ({len(entries)} results, {len(model_stats)} models)")


def main():
    parser = argparse.ArgumentParser(description="Score AI market predictions")
    parser.add_argument(
        "--date",
        default=today_et().isoformat(),
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

        # Close open paper trade if one exists
        try:
            from winner import load_simulator, save_simulator, close_trade, has_open_trade
            sim = load_simulator()
            if has_open_trade(sim):
                # Find the open trade's ticker and get its closing price
                open_ticker = None
                for trade in sim["trades"]:
                    if trade["status"] == "OPEN":
                        open_ticker = trade["ticker"]
                        break

                if open_ticker:
                    # Look for closing price in score results
                    closing_price = None
                    for result in score_data.get("results", []):
                        if result["ticker"] == open_ticker and result.get("actual_close") is not None:
                            closing_price = result["actual_close"]
                            break

                    if closing_price is None:
                        # Fallback: try to fetch directly
                        try:
                            from market_data import get_batch_closing_prices
                            d = datetime.strptime(args.date, "%Y-%m-%d").date()
                            prices = get_batch_closing_prices([open_ticker], d)
                            closing_price = prices.get(open_ticker)
                        except Exception as e:
                            log.warning(f"Could not fetch closing price for {open_ticker}: {e}")

                    if closing_price is not None:
                        sim = close_trade(sim, closing_price)
                        save_simulator(sim)
                    else:
                        log.warning(f"No closing price for {open_ticker} — trade stays open")
            else:
                log.info("No open trade to close")
        except Exception as e:
            log.error(f"Simulator close error (non-fatal): {e}")


if __name__ == "__main__":
    main()
