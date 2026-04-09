"""
Morning script: generate predictions from all AI models.
Run at 8:30 AM ET on weekdays before market open.

Usage:
    python generate.py [--date YYYY-MM-DD] [--models claude,perplexity,...]
"""

import argparse
import os
import sys
from datetime import date
from pathlib import Path

# Allow running from the scripts/ directory
sys.path.insert(0, str(Path(__file__).parent))

from adapters import ALL_ADAPTERS
from utils import (
    ensure_dirs,
    get_logger,
    is_market_open,
    save_json,
    sync_to_public,
    today_et,
    validate_prediction_payload,
    PREDICTIONS_DIR,
)

log = get_logger("generate")


def _write_ci_summary(date_str, results, success_count, total, failed):
    """Write summary to GitHub Actions step summary and outputs."""
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    output_file = os.environ.get("GITHUB_OUTPUT")

    if summary_file:
        with open(summary_file, "a") as f:
            f.write(f"## Morning Predictions — {date_str}\n\n")
            f.write(f"**{success_count}/{total}** models generated predictions.\n\n")
            for model, ok in results.items():
                icon = "\u2705" if ok else "\u274c"
                f.write(f"- {icon} {model}\n")
            if failed:
                f.write(f"\n**Failed:** {', '.join(failed)}\n")

    if output_file:
        with open(output_file, "a") as f:
            f.write(f"failed_models={','.join(failed)}\n")
            f.write(f"success_count={success_count}\n")
            f.write(f"total_count={total}\n")


def run(date_str: str, model_filter: list[str] | None = None):
    ensure_dirs()
    log.info(f"Generating predictions for {date_str}")

    adapters = ALL_ADAPTERS
    if model_filter:
        adapters = [a for a in adapters if a.slug in model_filter]
        log.info(f"Running adapters: {[a.slug for a in adapters]}")

    results = {}
    for adapter in adapters:
        out_dir = PREDICTIONS_DIR / date_str
        out_file = out_dir / f"{adapter.slug}.json"

        # Idempotency: skip if file already exists
        if out_file.exists():
            log.info(f"{adapter.slug}: already generated, skipping")
            results[adapter.slug] = True
            continue

        log.info(f"Running {adapter.slug}...")
        try:
            data = adapter.generate(date_str)
        except Exception as e:
            log.error(f"{adapter.slug}: unexpected error: {e}")
            data = None

        if data is None:
            log.error(f"{adapter.slug}: returned None — skipping")
            results[adapter.slug] = False
            continue

        # Validate
        errors = validate_prediction_payload(data, date_str, adapter.model_id)
        if errors:
            log.warning(f"{adapter.slug}: validation warnings: {errors}")
            # Don't fail — save anyway if we have predictions
            if "predictions" not in data or not data["predictions"]:
                log.error(f"{adapter.slug}: no valid predictions, discarding")
                results[adapter.slug] = False
                continue

        save_json(out_file, data)
        sync_to_public(out_file)
        log.info(f"{adapter.slug}: saved {len(data.get('predictions', []))} predictions to {out_file}")
        results[adapter.slug] = True

    success_count = sum(1 for v in results.values() if v)
    total = len(results)
    failed = [k for k, v in results.items() if not v]
    log.info(f"Done: {success_count}/{total} models succeeded")

    # Write GitHub Actions summary and outputs if running in CI
    _write_ci_summary(date_str, results, success_count, total, failed)

    if success_count == 0:
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
        help="Comma-separated list of model slugs to run (default: all)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Skip market holiday check",
    )
    args = parser.parse_args()

    if not args.force:
        from datetime import datetime
        d = datetime.strptime(args.date, "%Y-%m-%d").date()
        if not is_market_open(d):
            log.info(f"{args.date} is not a market day — exiting")
            sys.exit(0)

    model_filter = args.models.split(",") if args.models else None
    run(args.date, model_filter)


if __name__ == "__main__":
    main()
