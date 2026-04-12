"""Compute performance analytics from scored predictions."""
from __future__ import annotations

import sys
from collections import defaultdict
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import get_logger, load_json, save_json, sync_to_public, SCORES_DIR, DATA_DIR

log = get_logger("analytics")

INDEX_TICKERS = {"SPY", "QQQ", "DIA"}
MIN_TICKER_PREDICTIONS = 3


def ticker_group(ticker):
    if ticker in INDEX_TICKERS:
        return "index"
    if ticker.endswith("-USD"):
        return "crypto"
    return "stock"


def load_all_scores():
    """Load all score files, return flat list of results with date attached."""
    all_results = []
    for path in sorted(SCORES_DIR.glob("*.json")):
        data = load_json(path)
        date_str = data["date"]
        for r in data.get("results", []):
            if r.get("status") != "resolved":
                continue
            r["date"] = date_str
            all_results.append(r)
    return all_results


def compute_ticker_breakdown(results):
    """Per-ticker and per-group accuracy breakdown by model."""
    # Accumulate per (ticker, model)
    ticker_model = defaultdict(lambda: {"predictions": 0, "correct": 0, "total_score": 0.0, "total_conf": 0.0})
    for r in results:
        key = (r["ticker"], r["model_display_name"])
        d = ticker_model[key]
        d["predictions"] += 1
        d["correct"] += int(r["direction_correct"])
        d["total_score"] += r["score"]
        d["total_conf"] += r["confidence_at_prediction"]

    # Group by ticker
    tickers = defaultdict(list)
    for (ticker, model), d in ticker_model.items():
        tickers[ticker].append({
            "model": model,
            "predictions": d["predictions"],
            "correct": d["correct"],
            "accuracy": round(d["correct"] / d["predictions"], 4) if d["predictions"] else 0,
            "total_score": round(d["total_score"], 2),
            "avg_confidence": round(d["total_conf"] / d["predictions"], 4) if d["predictions"] else 0,
        })

    by_ticker = []
    for ticker, models in sorted(tickers.items()):
        total_preds = sum(m["predictions"] for m in models)
        if total_preds < MIN_TICKER_PREDICTIONS:
            continue
        by_ticker.append({
            "ticker": ticker,
            "group": ticker_group(ticker),
            "models": sorted(models, key=lambda m: m["model"]),
        })

    # Group by group
    group_model = defaultdict(lambda: {"predictions": 0, "correct": 0, "total_score": 0.0})
    for r in results:
        key = (ticker_group(r["ticker"]), r["model_display_name"])
        d = group_model[key]
        d["predictions"] += 1
        d["correct"] += int(r["direction_correct"])
        d["total_score"] += r["score"]

    groups = defaultdict(list)
    for (group, model), d in group_model.items():
        groups[group].append({
            "model": model,
            "predictions": d["predictions"],
            "correct": d["correct"],
            "accuracy": round(d["correct"] / d["predictions"], 4) if d["predictions"] else 0,
            "total_score": round(d["total_score"], 2),
        })

    by_group = [
        {"group": g, "models": sorted(ms, key=lambda m: m["model"])}
        for g, ms in sorted(groups.items())
    ]

    return {"by_ticker": by_ticker, "by_group": by_group}


def compute_calibration(results):
    """Confidence calibration buckets per model."""
    buckets_def = [
        ("50-59%", 0.50, 0.60, 0.55),
        ("60-69%", 0.60, 0.70, 0.65),
        ("70-79%", 0.70, 0.80, 0.75),
        ("80-89%", 0.80, 0.90, 0.85),
        ("90%+",   0.90, 1.01, 0.925),
    ]

    model_buckets = defaultdict(lambda: defaultdict(lambda: {"predictions": 0, "correct": 0}))
    for r in results:
        conf = r["confidence_at_prediction"]
        model = r["model_display_name"]
        for label, lo, hi, _ in buckets_def:
            if lo <= conf < hi:
                b = model_buckets[model][label]
                b["predictions"] += 1
                b["correct"] += int(r["direction_correct"])
                break

    models_out = []
    for model in sorted(model_buckets.keys()):
        buckets = []
        errors = []
        for label, _, _, midpoint in buckets_def:
            b = model_buckets[model][label]
            if b["predictions"] == 0:
                continue
            actual_acc = b["correct"] / b["predictions"]
            buckets.append({
                "confidence_range": label,
                "confidence_midpoint": midpoint,
                "predictions": b["predictions"],
                "correct": b["correct"],
                "actual_accuracy": round(actual_acc, 4),
            })
            errors.append(abs(midpoint - actual_acc))

        cal_error = round(sum(errors) / len(errors), 4) if errors else 0
        models_out.append({
            "model": model,
            "calibration_error": cal_error,
            "buckets": buckets,
        })

    return {"models": models_out}


def compute_herding(results):
    """Model agreement / herding analysis."""
    # Group predictions by (date, ticker)
    date_ticker = defaultdict(list)
    for r in results:
        date_ticker[(r["date"], r["ticker"])].append(r)

    total_overlaps = 0
    unanimous_count = 0
    unanimous_correct = 0
    split_count = 0
    contrarian_wins = 0
    daily_data = defaultdict(lambda: {"overlaps": 0, "unanimous": 0})

    for (date, ticker), preds in date_ticker.items():
        if len(preds) < 2:
            continue
        total_overlaps += 1
        daily_data[date]["overlaps"] += 1

        directions = [p["predicted_direction"] for p in preds]
        if len(set(directions)) == 1:
            unanimous_count += 1
            daily_data[date]["unanimous"] += 1
            # Check if the unanimous call was correct
            if preds[0]["direction_correct"]:
                unanimous_correct += 1
        else:
            split_count += 1
            # Contrarian win: minority direction was correct
            from collections import Counter
            dir_counts = Counter(directions)
            minority_dir = dir_counts.most_common()[-1][0]
            for p in preds:
                if p["predicted_direction"] == minority_dir and p["direction_correct"]:
                    contrarian_wins += 1
                    break

    herding_rate = round(unanimous_count / total_overlaps, 4) if total_overlaps else 0
    unan_acc = round(unanimous_correct / unanimous_count, 4) if unanimous_count else 0

    daily_herding = []
    for date in sorted(daily_data.keys()):
        d = daily_data[date]
        daily_herding.append({
            "date": date,
            "overlaps": d["overlaps"],
            "unanimous": d["unanimous"],
            "herding_rate": round(d["unanimous"] / d["overlaps"], 4) if d["overlaps"] else 0,
        })

    return {
        "summary": {
            "total_overlaps": total_overlaps,
            "unanimous": unanimous_count,
            "split": split_count,
            "herding_rate": herding_rate,
            "unanimous_correct": unanimous_correct,
            "unanimous_accuracy": unan_acc,
            "contrarian_wins": contrarian_wins,
        },
        "daily_herding": daily_herding,
    }


def compute_time_series(results):
    """Daily scores and rolling accuracy per model."""
    # Daily aggregation
    daily_model = defaultdict(lambda: defaultdict(lambda: {"score": 0.0, "correct": 0, "predictions": 0}))
    for r in results:
        d = daily_model[r["date"]][r["model_display_name"]]
        d["score"] += r["score"]
        d["correct"] += int(r["direction_correct"])
        d["predictions"] += 1

    dates = sorted(daily_model.keys())
    all_models = sorted({r["model_display_name"] for r in results})

    # Build cumulative scores
    cumulative = {m: 0.0 for m in all_models}
    daily = []
    for date in dates:
        entry = {"date": date}
        for m in all_models:
            d = daily_model[date].get(m, {"score": 0, "correct": 0, "predictions": 0})
            cumulative[m] += d["score"]
            acc = round(d["correct"] / d["predictions"], 4) if d["predictions"] else None
            entry[m] = {
                "daily_score": round(d["score"], 2),
                "cumulative_score": round(cumulative[m], 2),
                "accuracy": acc,
                "predictions": d["predictions"],
            }
        daily.append(entry)

    # 5-day rolling accuracy
    rolling = []
    for i, date in enumerate(dates):
        window_start = max(0, i - 4)
        entry = {"date": date}
        for m in all_models:
            total_c = 0
            total_p = 0
            for j in range(window_start, i + 1):
                d_date = dates[j]
                d = daily_model[d_date].get(m, {"correct": 0, "predictions": 0})
                total_c += d["correct"]
                total_p += d["predictions"]
            entry[m] = round(total_c / total_p, 4) if total_p else None
        rolling.append(entry)

    return {"daily": daily, "rolling_accuracy": rolling}


def compute_head_to_head(results):
    """Pairwise model comparison on same-ticker same-day predictions."""
    # Index by (date, ticker, model)
    lookup = {}
    for r in results:
        lookup[(r["date"], r["ticker"], r["model_display_name"])] = r

    # Group by (date, ticker) to find overlapping models
    date_ticker_models = defaultdict(set)
    for r in results:
        date_ticker_models[(r["date"], r["ticker"])].add(r["model_display_name"])

    # Pairwise records
    pair_records = defaultdict(lambda: {"matchups": 0, "a_wins": 0, "b_wins": 0, "ties": 0})
    recent_clashes = []

    all_models = sorted({r["model_display_name"] for r in results})
    pairs = list(combinations(all_models, 2))

    for (date, ticker), models in sorted(date_ticker_models.items()):
        models_list = sorted(models)
        for a, b in combinations(models_list, 2):
            key = (a, b) if a < b else (b, a)
            ra = lookup.get((date, ticker, a))
            rb = lookup.get((date, ticker, b))
            if not ra or not rb:
                continue

            rec = pair_records[key]
            rec["matchups"] += 1
            a_correct = ra["direction_correct"]
            b_correct = rb["direction_correct"]

            winner = None
            if a_correct and not b_correct:
                rec["a_wins"] += 1
                winner = a
            elif b_correct and not a_correct:
                rec["b_wins"] += 1
                winner = b
            else:
                rec["ties"] += 1
                winner = "Tie"

            recent_clashes.append({
                "date": date,
                "ticker": ticker,
                "model_a": key[0],
                "model_a_direction": ra["predicted_direction"],
                "model_a_correct": a_correct,
                "model_b": key[1],
                "model_b_direction": rb["predicted_direction"],
                "model_b_correct": b_correct,
                "winner": winner,
            })

    records = []
    for (a, b), rec in sorted(pair_records.items()):
        records.append({
            "model_a": a,
            "model_b": b,
            "matchups": rec["matchups"],
            "a_wins": rec["a_wins"],
            "b_wins": rec["b_wins"],
            "ties": rec["ties"],
            "a_win_rate": round(rec["a_wins"] / (rec["a_wins"] + rec["b_wins"]), 4) if (rec["a_wins"] + rec["b_wins"]) else 0.5,
        })

    # Only keep last 15 clashes where there was a decisive winner
    decisive = [c for c in recent_clashes if c["winner"] != "Tie"]
    decisive = decisive[-15:]

    return {"records": records, "recent_clashes": decisive}


def main():
    log.info("Loading scored predictions...")
    results = load_all_scores()

    if not results:
        log.warning("No scored predictions found. Exiting.")
        return

    dates = sorted({r["date"] for r in results})
    log.info(f"Found {len(results)} predictions across {len(dates)} days")

    analytics = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data_range": {
            "first_date": dates[0],
            "last_date": dates[-1],
            "scoring_days": len(dates),
            "total_predictions": len(results),
        },
        "ticker_breakdown": compute_ticker_breakdown(results),
        "calibration": compute_calibration(results),
        "herding": compute_herding(results),
        "time_series": compute_time_series(results),
        "head_to_head": compute_head_to_head(results),
    }

    out_path = DATA_DIR / "analytics.json"
    save_json(out_path, analytics)
    sync_to_public(out_path)
    log.info(f"Analytics written to {out_path}")


if __name__ == "__main__":
    main()
