from __future__ import annotations

"""
Morning script: generate predictions from all AI models.
Run on weekday mornings; all models are queried in parallel with the same prompt.

Usage:
    python generate.py [--date YYYY-MM-DD] [--models slug1,slug2] [--overwrite] [--dry-run]
"""

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

# Allow running from the scripts/ directory
sys.path.insert(0, str(Path(__file__).parent))

from adapters import ALL_ADAPTERS
from utils import (
    ALLOWED_DIRECTIONS,
    ALLOWED_TIMEFRAMES,
    ensure_dirs,
    get_logger,
    is_market_open,
    save_json,
    sync_to_public,
    today_et,
    validate_prediction_payload,
    PREDICTIONS_DIR,
    RUNS_DIR,
)

log = get_logger("generate")

MAX_PREDICTIONS = 5


def _now_et_label() -> str:
    from zoneinfo import ZoneInfo
    return datetime.now(ZoneInfo("America/New_York")).strftime("%A %Y-%m-%d %I:%M %p")


def _to_float(value) -> float | None:
    try:
        return float(str(value).replace("$", "").replace(",", ""))
    except (TypeError, ValueError):
        return None


def normalize_predictions(data: dict, adapter, date_str: str) -> list[str]:
    """Coerce a model's raw answer into the stored schema. Returns a list of issues."""
    issues = []
    clean = []
    for raw in data.get("predictions") or []:
        if not isinstance(raw, dict):
            continue
        ticker = str(raw.get("ticker", "")).strip().upper().lstrip("$")
        direction = str(raw.get("direction", "")).strip().lower()
        timeframe = str(raw.get("timeframe") or "end_of_day").strip().lower()
        confidence = _to_float(raw.get("confidence"))
        target = _to_float(raw.get("target_price"))
        if confidence is not None and confidence > 1:
            confidence /= 100  # model answered in percent
        if not ticker or direction not in ALLOWED_DIRECTIONS or timeframe not in ALLOWED_TIMEFRAMES:
            issues.append(f"dropped invalid prediction: {ticker or '?'} {direction} {timeframe}")
            continue
        if confidence is None or target is None or target <= 0:
            issues.append(f"dropped {ticker}: missing confidence or target")
            continue
        clean.append({
            "ticker": ticker,
            "prediction_type": "price_direction",
            "direction": direction,
            "target_price": round(target, 4),
            "model_reported_price": _to_float(raw.get("current_price_at_prediction")),
            "timeframe": timeframe,
            "confidence": round(min(max(confidence, 0.50), 0.95), 4),
            "reasoning": str(raw.get("reasoning", "")).strip(),
        })

    if len(clean) > MAX_PREDICTIONS:
        issues.append(f"kept first {MAX_PREDICTIONS} of {len(clean)} predictions")
        clean = clean[:MAX_PREDICTIONS]

    # IDs are assigned here so they're unique even when models copy the example
    date_compact = date_str.replace("-", "")
    data["predictions"] = [
        {"id": f"pred_{adapter.slug}_{date_compact}_{i:03d}", **pred}
        for i, pred in enumerate(clean, 1)
    ]
    return issues


def attach_live_prices(data: dict, slug: str) -> None:
    """Record the real price at prediction time — the baseline direction is scored against.

    Models' self-reported prices can be stale or hallucinated, and the job may run
    after the open, so the live Yahoo price is the only fair baseline.
    """
    from market_data import get_current_price
    fetched_at = datetime.now(timezone.utc).isoformat()
    for pred in data["predictions"]:
        live = get_current_price(pred["ticker"])
        if live is not None:
            pred["current_price_at_prediction"] = live
            pred["price_source"] = "yfinance_live"
        elif pred.get("model_reported_price"):
            pred["current_price_at_prediction"] = pred["model_reported_price"]
            pred["price_source"] = "model_reported"
            log.warning(f"{slug} {pred['ticker']}: no live price, using model-reported baseline")
        else:
            pred["current_price_at_prediction"] = None
            pred["price_source"] = None
        pred["price_fetched_at"] = fetched_at
    # A prediction without any baseline can never be scored — drop it
    data["predictions"] = [p for p in data["predictions"] if p["current_price_at_prediction"]]


def _write_ci_summary(date_str, statuses):
    """Write summary to GitHub Actions step summary and outputs."""
    failed = [s for s, st in statuses.items() if not st["ok"]]
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    output_file = os.environ.get("GITHUB_OUTPUT")

    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as f:
            ok_count = len(statuses) - len(failed)
            f.write(f"## Morning Predictions — {date_str}\n\n**{ok_count}/{len(statuses)}** models succeeded.\n\n")
            f.write("| Model | Result | Predictions | Search | Citations | Cost |\n|---|---|---|---|---|---|\n")
            for slug, st in statuses.items():
                icon = "✅" if st["ok"] else "❌"
                cost = f"${st['cost_usd']:.4f}" if st.get("cost_usd") else "—"
                detail = st.get("predictions", 0) if st["ok"] else (st.get("error") or "failed")[:120]
                f.write(f"| {slug} | {icon} | {detail} | {st.get('web_search', '—')} | {st.get('citations', '—')} | {cost} |\n")

    if output_file:
        with open(output_file, "a", encoding="utf-8") as f:
            f.write(f"failed_models={','.join(failed)}\n")


def run(
    date_str: str,
    model_filter: list[str] | None = None,
    overwrite: bool = False,
    dry_run: bool = False,
):
    ensure_dirs()
    log.info(f"Generating predictions for {date_str}{' (dry run)' if dry_run else ''}")

    # Fetch standardized market data for all models
    market_context = ""
    try:
        from market_data import get_market_context
        market_context = get_market_context()
        if not market_context:
            log.warning("Market context came back empty — models will rely on web search only")
    except Exception as e:
        log.warning(f"Could not fetch market context (non-fatal): {e}")

    # Append FRED macro indicators if available
    try:
        from fred_data import get_fred_context
        fred_context = get_fred_context()
        if fred_context:
            market_context = f"{market_context}\n\n{fred_context}" if market_context else fred_context
    except Exception as e:
        log.warning(f"Could not fetch FRED data (non-fatal): {e}")

    adapters = ALL_ADAPTERS
    if model_filter:
        adapters = [a for a in adapters if a.slug in model_filter]

    statuses = {}
    pending = []
    for adapter in adapters:
        out_file = PREDICTIONS_DIR / date_str / f"{adapter.slug}.json"
        # Idempotency by default, with an explicit overwrite path for manual reruns.
        if out_file.exists() and not overwrite and not dry_run:
            log.info(f"{adapter.slug}: already generated, skipping")
            statuses[adapter.slug] = {"ok": True, "skipped": True}
            continue
        pending.append(adapter)

    now_et = _now_et_label()
    log.info(f"Querying {len(pending)} models in parallel at {now_et} ET")
    with ThreadPoolExecutor(max_workers=max(1, len(pending))) as pool:
        futures = {
            pool.submit(a.generate, date_str, market_context, now_et): a for a in pending
        }
        for future in as_completed(futures):
            adapter = futures[future]
            try:
                data = future.result()
            except Exception as e:
                adapter.last_error = f"unexpected error: {e}"
                data = None

            if data is None:
                log.error(f"{adapter.slug}: failed — {adapter.last_error}")
                statuses[adapter.slug] = {"ok": False, "error": adapter.last_error}
                continue

            issues = normalize_predictions(data, adapter, date_str)
            attach_live_prices(data, adapter.slug)
            run_meta = data.pop("run", {})
            payload = {
                "date": date_str,
                "slug": adapter.slug,
                "model": adapter.model_id,
                "model_display_name": adapter.model_display_name,
                "generated_at": run_meta.get("finished_at") or datetime.now(timezone.utc).isoformat(),
                "market_context": str(data.get("market_context", "")).strip(),
                "predictions": data["predictions"],
                "run": {**run_meta, "normalization_issues": issues},
            }
            for err in validate_prediction_payload(payload, date_str, adapter.model_id):
                log.warning(f"{adapter.slug}: {err}")

            status = {
                "ok": bool(payload["predictions"]),
                "predictions": len(payload["predictions"]),
                "web_search": run_meta.get("web_search"),
                "citations": len(run_meta.get("citations") or []),
                "cost_usd": run_meta.get("cost_usd"),
                "latency_seconds": run_meta.get("latency_seconds"),
            }
            if not payload["predictions"]:
                status["error"] = "No valid predictions after validation"
                log.error(f"{adapter.slug}: no valid predictions, discarding")
            statuses[adapter.slug] = status

            if dry_run:
                print(json.dumps(payload, indent=2))
            elif payload["predictions"]:
                out_file = PREDICTIONS_DIR / date_str / f"{adapter.slug}.json"
                save_json(out_file, payload)
                sync_to_public(out_file)
                log.info(f"{adapter.slug}: saved {len(payload['predictions'])} predictions")

    statuses = dict(sorted(statuses.items()))
    ok_count = sum(1 for s in statuses.values() if s["ok"])
    log.info(f"Done: {ok_count}/{len(statuses)} models succeeded")
    _write_ci_summary(date_str, statuses)

    if dry_run:
        return

    # Per-day run record so the site can show which models missed the day and why
    run_file = RUNS_DIR / f"{date_str}.json"
    save_json(run_file, {"date": date_str, "prompted_at_et": now_et, "models": statuses})
    sync_to_public(run_file)

    if ok_count == 0:
        log.error("All models failed — this is a problem")
        sys.exit(1)

    # Select today's winner and open paper trade
    try:
        from winner import select_todays_winner, save_winner, load_simulator, save_simulator, open_trade, has_open_trade
        winner = select_todays_winner(date_str)
        save_winner(date_str, winner)
        if winner and not has_open_trade(load_simulator()):
            sim = load_simulator()
            sim = open_trade(sim, winner, date_str)
            save_simulator(sim)
        elif winner:
            log.info("Winner found but trade already open — skipping")
        else:
            log.info("No consensus winner today — no trade opened")
    except Exception as e:
        log.error(f"Winner/simulator error (non-fatal): {e}")


def main():
    parser = argparse.ArgumentParser(description="Generate AI market predictions")
    parser.add_argument(
        "--date",
        default=today_et().isoformat(),
        help="Date to generate predictions for (YYYY-MM-DD, default: today)",
    )
    parser.add_argument(
        "--models",
        help="Comma-separated list of model slugs to run (default: all active)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip market holiday check",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing prediction files for the target date",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Call the models and print results without saving anything",
    )
    args = parser.parse_args()

    if not args.force and not args.dry_run:
        d = datetime.strptime(args.date, "%Y-%m-%d").date()
        if not is_market_open(d):
            log.info(f"{args.date} is not a market day — exiting")
            sys.exit(0)

    model_filter = args.models.split(",") if args.models else None
    run(args.date, model_filter, overwrite=args.overwrite, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
