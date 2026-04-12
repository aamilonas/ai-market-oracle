from __future__ import annotations

"""
Summarize script: generate daily and weekly narrative recaps.
Uses Claude Haiku for cost efficiency.

Usage:
    python summarize.py --daily [--date YYYY-MM-DD]
    python summarize.py --weekly [--week 2025-W08]
"""

import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from utils import (
    DATA_DIR,
    ensure_dirs,
    get_logger,
    load_json,
    save_json,
    sync_to_public,
    today_et,
    extract_json_from_text,
    PREDICTIONS_DIR,
    SCORES_DIR,
    SUMMARIES_DAILY_DIR,
    SUMMARIES_WEEKLY_DIR,
    LEADERBOARD_FILE,
)

log = get_logger("summarize")
SUMMARY_MODEL_ID = "claude-3-5-haiku-latest"


def get_claude_client():
    import os
    import anthropic
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")
    return anthropic.Anthropic(api_key=api_key)


def build_fallback_daily_summary(date_str: str, pred_summary: list[dict]) -> dict:
    """Build a deterministic summary when the LLM summary step is unavailable."""
    generated_at = datetime.now(timezone.utc).isoformat()
    ticker_groups = defaultdict(list)
    for pred in pred_summary:
        ticker_groups[pred["ticker"]].append(pred)

    consensus_picks = []
    for ticker, picks in sorted(ticker_groups.items()):
        direction_counts = Counter(p["direction"] for p in picks)
        agreed_direction, agree_count = direction_counts.most_common(1)[0]
        if agree_count < 2:
            continue
        consensus_picks.append({
            "ticker": ticker,
            "models_agreeing": [p["model"] for p in picks if p["direction"] == agreed_direction],
            "agreed_direction": agreed_direction,
            "outcome": "pending" if all(p["score"] is None for p in picks) else "split",
            "note": f"{agree_count} models aligned on {ticker} {agreed_direction}.",
        })

    best_pred = max(pred_summary, key=lambda p: p["confidence"], default=None)
    worst_pred = min(pred_summary, key=lambda p: p["confidence"], default=None)
    unique_tickers = sorted({p["ticker"] for p in pred_summary})

    return {
        "date": date_str,
        "generated_at": generated_at,
        "headline": f"{len(pred_summary)} AI market calls queued for {date_str}",
        "summary": (
            f"{len(pred_summary)} predictions were generated across {len(unique_tickers)} tickers. "
            "This fallback summary was created automatically because the narrative summary model was unavailable."
        ),
        "consensus_picks": consensus_picks[:5],
        "best_call": ({
            "prediction_id": None,
            "model_display_name": best_pred["model"],
            "ticker": best_pred["ticker"],
            "score": best_pred["score"],
            "summary": f"Highest-confidence call came from {best_pred['model']} on {best_pred['ticker']}.",
        } if best_pred else None),
        "worst_call": ({
            "prediction_id": None,
            "model_display_name": worst_pred["model"],
            "ticker": worst_pred["ticker"],
            "score": worst_pred["score"],
            "summary": f"Lowest-confidence call came from {worst_pred['model']} on {worst_pred['ticker']}.",
        } if worst_pred else None),
    }


def build_fallback_weekly_summary(
    week_str: str,
    monday: date,
    friday: date,
    all_results: list[dict],
) -> dict:
    """Build a deterministic weekly summary when the LLM summary step is unavailable."""
    generated_at = datetime.now(timezone.utc).isoformat()
    per_model = defaultdict(lambda: {"score": 0.0, "predictions": 0, "correct": 0})
    ticker_groups = defaultdict(list)
    for result in all_results:
        model = result["model_display_name"]
        per_model[model]["score"] += result["score"]
        per_model[model]["predictions"] += 1
        per_model[model]["correct"] += int(bool(result["direction_correct"]))
        ticker_groups[(result.get("date"), result["ticker"])].append(result)

    scores = []
    for model, stats in per_model.items():
        preds = stats["predictions"]
        scores.append({
            "model": model,
            "weekly_score": round(stats["score"], 2),
            "predictions": preds,
            "accuracy": round(stats["correct"] / preds, 4) if preds else 0.0,
            "rank_change": 0,
        })
    scores.sort(key=lambda item: item["weekly_score"], reverse=True)

    best_call = max(all_results, key=lambda r: r["score"], default=None)
    worst_call = min(all_results, key=lambda r: r["score"], default=None)

    consensus_total = 0
    consensus_correct = 0
    for picks in ticker_groups.values():
        if len(picks) < 2:
            continue
        directions = {p["predicted_direction"] for p in picks}
        if len(directions) == 1:
            consensus_total += 1
            if all(p["direction_correct"] for p in picks):
                consensus_correct += 1

    leader = scores[0]["model"] if scores else "No model"
    return {
        "week": week_str,
        "period": f"{monday.strftime('%b %-d')} – {friday.strftime('%b %-d, %Y')}",
        "generated_at": generated_at,
        "headline": f"{leader} led {week_str} on raw weekly score",
        "summary": (
            "This fallback weekly summary was created automatically because the narrative summary model "
            "was unavailable."
        ),
        "scores": scores,
        "best_call": ({
            "model": best_call["model_display_name"],
            "ticker": best_call["ticker"],
            "score": best_call["score"],
            "summary": f"Top single-call score of the week belonged to {best_call['model_display_name']}.",
        } if best_call else None),
        "worst_call": ({
            "model": worst_call["model_display_name"],
            "ticker": worst_call["ticker"],
            "score": worst_call["score"],
            "summary": f"Lowest single-call score of the week belonged to {worst_call['model_display_name']}.",
        } if worst_call else None),
        "consensus_accuracy": {
            "total_consensus_calls": consensus_total,
            "consensus_correct": consensus_correct,
            "accuracy": round(consensus_correct / consensus_total, 4) if consensus_total else 0.0,
        },
    }


# ── Daily summary ──────────────────────────────────────────────────────────────

def build_daily_summary(date_str: str, force: bool = False) -> dict | None:
    out_file = SUMMARIES_DAILY_DIR / f"{date_str}.json"
    if out_file.exists() and not force:
        log.info(f"Daily summary already exists for {date_str}")
        return load_json(out_file)

    pred_dir = PREDICTIONS_DIR / date_str
    score_file = SCORES_DIR / f"{date_str}.json"

    if not pred_dir.exists():
        log.error(f"No predictions for {date_str}")
        return None

    # Collect all predictions and scores
    all_preds = []
    for pf in sorted(pred_dir.glob("*.json")):
        try:
            data = load_json(pf)
            all_preds.append(data)
        except Exception as e:
            log.error(f"Could not load {pf}: {e}")

    scores = []
    if score_file.exists():
        score_data = load_json(score_file)
        scores = score_data.get("results", [])

    score_map = {r["prediction_id"]: r for r in scores}

    # Build a compact summary for the AI to analyze
    pred_summary = []
    for model_data in all_preds:
        for pred in model_data.get("predictions", []):
            score = score_map.get(pred["id"])
            pred_summary.append({
                "model": model_data["model_display_name"],
                "ticker": pred["ticker"],
                "direction": pred["direction"],
                "confidence": pred["confidence"],
                "target": pred["target_price"],
                "reasoning_snippet": pred["reasoning"][:100],
                "score": score["score"] if score else None,
                "correct": score["direction_correct"] if score else None,
                "actual_close": score["actual_close"] if score else None,
            })

    prompt = f"""You are summarizing a daily AI stock prediction experiment for {date_str}.

Here are all predictions made today with their outcomes:
{json.dumps(pred_summary, indent=2)}

Write a daily summary in JSON with this exact structure:
{{
  "date": "{date_str}",
  "generated_at": "{datetime.now(timezone.utc).isoformat()}",
  "headline": "A punchy 10-15 word headline summarizing the day",
  "summary": "2-3 sentence narrative summary of the day's predictions and outcomes",
  "consensus_picks": [
    {{
      "ticker": "TICKER",
      "models_agreeing": ["Model1", "Model2"],
      "agreed_direction": "up or down or disagree",
      "outcome": "correct or wrong or split or pending",
      "note": "1 sentence about this"
    }}
  ],
  "best_call": {{
    "prediction_id": "pred_...",
    "model_display_name": "ModelName",
    "ticker": "TICKER",
    "score": 1.5,
    "summary": "1 sentence about why this was the best call"
  }},
  "worst_call": {{
    "prediction_id": "pred_...",
    "model_display_name": "ModelName",
    "ticker": "TICKER",
    "score": -0.75,
    "summary": "1 sentence about why this was the worst call"
  }}
}}

Focus on: what was interesting, surprising, or notable. Which models agreed? Who nailed it or missed badly?
Return ONLY valid JSON."""

    try:
        client = get_claude_client()
        response = client.messages.create(
            model=SUMMARY_MODEL_ID,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text if response.content else ""
        data = extract_json_from_text(text)
        if data:
            save_json(out_file, data)
            sync_to_public(out_file)
            log.info(f"Daily summary saved for {date_str}")
            return data
        else:
            log.error("Could not parse daily summary JSON from response")
    except Exception as e:
        log.error(f"Daily summary generation failed: {e}")

    fallback = build_fallback_daily_summary(date_str, pred_summary)
    save_json(out_file, fallback)
    sync_to_public(out_file)
    log.warning(f"Daily summary fallback saved for {date_str}")
    return fallback


# ── Weekly summary ─────────────────────────────────────────────────────────────

def build_weekly_summary(week_str: str) -> dict | None:
    """week_str like '2025-W08'"""
    out_file = SUMMARIES_WEEKLY_DIR / f"{week_str}.json"
    if out_file.exists():
        log.info(f"Weekly summary already exists for {week_str}")
        return load_json(out_file)

    # Parse week to get date range
    year, wn = week_str.split("-W")
    year, wn = int(year), int(wn)
    # Monday of that week
    monday = date.fromisocalendar(year, wn, 1)
    friday = monday + timedelta(days=4)

    log.info(f"Summarizing week {week_str}: {monday} to {friday}")

    # Gather all scores for the week
    all_results = []
    d = monday
    while d <= friday:
        score_file = SCORES_DIR / f"{d.isoformat()}.json"
        if score_file.exists():
            score_data = load_json(score_file)
            all_results.extend(score_data.get("results", []))
        d += timedelta(days=1)

    if not all_results:
        log.warning(f"No scores found for week {week_str}")
        return None

    # Load leaderboard for overall stats
    lb_data = load_json(LEADERBOARD_FILE) if LEADERBOARD_FILE.exists() else {}

    prompt = f"""You are writing a weekly recap of an AI stock prediction experiment.

Week: {week_str} ({monday} to {friday})

All prediction results from this week:
{json.dumps(all_results[:50], indent=2)}

Write a weekly summary in JSON:
{{
  "week": "{week_str}",
  "period": "{monday.strftime('%b %-d')} – {friday.strftime('%b %-d, %Y')}",
  "generated_at": "{datetime.now(timezone.utc).isoformat()}",
  "headline": "Punchy 10-15 word headline for the week",
  "summary": "2-4 sentence narrative of the week's highlights and story",
  "scores": [
    {{
      "model": "ModelName",
      "weekly_score": 3.2,
      "predictions": 15,
      "accuracy": 0.667,
      "rank_change": 1
    }}
  ],
  "best_call": {{
    "model": "ModelName",
    "ticker": "TICKER",
    "score": 1.5,
    "summary": "1 sentence"
  }},
  "worst_call": {{
    "model": "ModelName",
    "ticker": "TICKER",
    "score": -0.85,
    "summary": "1 sentence"
  }},
  "consensus_accuracy": {{
    "total_consensus_calls": 8,
    "consensus_correct": 5,
    "accuracy": 0.625
  }}
}}

Focus on narrative: what was the story of the week? Who rose, who fell? Any remarkable calls?
Return ONLY valid JSON."""

    try:
        client = get_claude_client()
        response = client.messages.create(
            model=SUMMARY_MODEL_ID,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text if response.content else ""
        data = extract_json_from_text(text)
        if data:
            save_json(out_file, data)
            sync_to_public(out_file)
            log.info(f"Weekly summary saved for {week_str}")
            return data
        else:
            log.error("Could not parse weekly summary JSON")
    except Exception as e:
        log.error(f"Weekly summary generation failed: {e}")

    fallback = build_fallback_weekly_summary(week_str, monday, friday, all_results)
    save_json(out_file, fallback)
    sync_to_public(out_file)
    log.warning(f"Weekly summary fallback saved for {week_str}")
    return fallback


def update_weeks_index():
    """Rebuild data/weeks-index.json from files on disk."""
    weeks = sorted(f.stem for f in SUMMARIES_WEEKLY_DIR.glob("*.json"))
    idx_file = DATA_DIR / "weeks-index.json"
    save_json(idx_file, weeks)
    sync_to_public(idx_file)
    log.info(f"weeks-index.json updated: {weeks}")


def main():
    parser = argparse.ArgumentParser(description="Generate summaries")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--daily", action="store_true")
    group.add_argument("--weekly", action="store_true")
    parser.add_argument("--date", default=today_et().isoformat())
    parser.add_argument("--week", help="Week string like 2025-W08")
    parser.add_argument("--force", action="store_true", help="Overwrite existing summary")
    args = parser.parse_args()

    ensure_dirs()

    if args.daily:
        result = build_daily_summary(args.date, force=args.force)
        if result:
            log.info(f"Daily summary: {result.get('headline', 'done')}")
        else:
            log.warning("Daily summary skipped — no predictions or summary data available")
            sys.exit(0)

    elif args.weekly:
        if not args.week:
            # Default to last completed week
            today = today_et()
            last_monday = today - timedelta(days=today.weekday() + 7)
            cal = last_monday.isocalendar()
            week_str = f"{cal.year}-W{cal.week:02d}"
        else:
            week_str = args.week
        result = build_weekly_summary(week_str)
        if result:
            update_weeks_index()
            log.info(f"Weekly summary: {result.get('headline', 'done')}")
        else:
            log.warning("No data available for weekly summary — skipping")
            sys.exit(0)


if __name__ == "__main__":
    main()
