from __future__ import annotations

"""
Summarize script: generate daily and weekly recaps.

All numbers (scores, consensus outcomes, best/worst calls) are computed here
from the data files. The LLM only writes the headline and narrative, so a
summary can never misreport a score.

Usage:
    python summarize.py --daily [--date YYYY-MM-DD] [--force]
    python summarize.py --weekly [--week 2025-W08] [--force]
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
)

log = get_logger("summarize")

# Narrator model. Kept cheap; it writes prose only, never numbers.
SUMMARY_MODEL_ID = "anthropic/claude-haiku-5.5"


def write_narrative(facts: dict, kind: str) -> dict | None:
    """Ask the narrator for {"headline", "summary"} given computed facts."""
    length = "2-3 sentences" if kind == "daily" else "3-4 sentences"
    prompt = f"""You are writing the {kind} recap for an AI stock-prediction benchmark
in which several AI models make same-day price-direction calls that are scored at the close.

Here are the computed facts. Do not change or invent any numbers.
{json.dumps(facts, indent=2)}

Return ONLY JSON:
{{"headline": "punchy 8-15 word headline", "summary": "{length} narrative: who led, notable agreements or disagreements, standout calls"}}"""
    try:
        from openrouter import get_client
        response = get_client().chat.completions.create(
            model=SUMMARY_MODEL_ID,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
        )
        data = extract_json_from_text(response.choices[0].message.content or "")
        if data and data.get("headline") and data.get("summary"):
            return {"headline": str(data["headline"]), "summary": str(data["summary"])}
        log.error(f"Could not parse {kind} narrative JSON")
    except Exception as e:
        log.error(f"{kind.capitalize()} narrative generation failed: {e}")
    return None


def _call(pred: dict, summary: str) -> dict:
    return {
        "prediction_id": pred["id"],
        "model_display_name": pred["model"],
        "ticker": pred["ticker"],
        "score": pred["score"],
        "summary": summary,
    }


# ── Daily summary ──────────────────────────────────────────────────────────────

def daily_facts(date_str: str) -> tuple[list[dict], dict] | None:
    pred_dir = PREDICTIONS_DIR / date_str
    if not pred_dir.exists():
        return None

    score_file = SCORES_DIR / f"{date_str}.json"
    score_map = {}
    if score_file.exists():
        score_map = {r["prediction_id"]: r for r in load_json(score_file).get("results", [])}

    preds = []
    for pf in sorted(pred_dir.glob("*.json")):
        try:
            data = load_json(pf)
        except Exception as e:
            log.error(f"Could not load {pf}: {e}")
            continue
        for pred in data.get("predictions", []):
            sc = score_map.get(pred["id"])
            resolved = bool(sc and sc.get("status") == "resolved")
            preds.append({
                "id": pred["id"],
                "model": data["model_display_name"],
                "ticker": pred["ticker"],
                "direction": pred["direction"],
                "confidence": pred["confidence"],
                "score": sc["score"] if resolved else None,
                "correct": sc["direction_correct"] if resolved else None,
            })
    if not preds:
        return None

    # Consensus: tickers predicted by 2+ models
    by_ticker = defaultdict(list)
    for p in preds:
        by_ticker[p["ticker"]].append(p)

    consensus = []
    for ticker, picks in by_ticker.items():
        if len(picks) < 2:
            continue
        counts = Counter(p["direction"] for p in picks)
        if len(counts) > 1:
            consensus.append({
                "ticker": ticker,
                "models_agreeing": [],
                "agreed_direction": "disagree",
                "outcome": "split",
                "note": ", ".join(f"{n} {d}" for d, n in counts.most_common()) + f" across {len(picks)} models.",
                "_weight": len(picks),
            })
            continue
        direction = picks[0]["direction"]
        outcomes = {p["correct"] for p in picks}
        if None in outcomes:
            outcome = "pending"
        elif outcomes == {True}:
            outcome = "correct"
        elif outcomes == {False}:
            outcome = "wrong"
        else:
            outcome = "split"
        consensus.append({
            "ticker": ticker,
            "models_agreeing": [p["model"] for p in picks],
            "agreed_direction": direction,
            "outcome": outcome,
            "note": f"{len(picks)} models called {ticker} {direction}.",
            "_weight": len(picks) + 0.5,  # agreements rank above equal-size splits
        })
    consensus.sort(key=lambda c: -c["_weight"])
    for c in consensus:
        c.pop("_weight")

    scored = [p for p in preds if p["score"] is not None]
    if scored:
        best = max(scored, key=lambda p: p["score"])
        worst = min(scored, key=lambda p: p["score"])
        best_call = _call(best, f"{best['model']}'s {best['ticker']} {best['direction']} call scored highest today.")
        worst_call = _call(worst, f"{worst['model']}'s {worst['ticker']} {worst['direction']} call scored lowest today.")
    else:
        best = max(preds, key=lambda p: p["confidence"])
        best_call = _call(best, f"Highest-conviction call of the morning ({best['confidence']:.0%}). Scored after the close.")
        worst_call = None

    facts = {
        "date": date_str,
        "scored": bool(scored),
        "models_reporting": sorted({p["model"] for p in preds}),
        "predictions": preds,
        "consensus_picks": consensus[:6],
        "best_call": best_call,
        "worst_call": worst_call,
    }
    if scored:
        per_model = defaultdict(float)
        for p in scored:
            per_model[p["model"]] += p["score"]
        facts["model_scores_today"] = {m: round(s, 2) for m, s in sorted(per_model.items(), key=lambda kv: -kv[1])}
    return preds, facts


def build_daily_summary(date_str: str, force: bool = False) -> dict | None:
    out_file = SUMMARIES_DAILY_DIR / f"{date_str}.json"
    if out_file.exists() and not force:
        log.info(f"Daily summary already exists for {date_str}")
        return load_json(out_file)

    computed = daily_facts(date_str)
    if computed is None:
        log.error(f"No predictions for {date_str}")
        return None
    preds, facts = computed

    llm_narrative = write_narrative(
        {k: v for k, v in facts.items() if k != "predictions"} | {"prediction_count": len(preds)},
        "daily",
    )
    status = "scored" if facts["scored"] else "queued"
    narrative = llm_narrative or {
        "headline": f"{len(preds)} AI market calls {status} for {date_str}",
        "summary": f"{len(facts['models_reporting'])} models made {len(preds)} predictions across "
                   f"{len({p['ticker'] for p in preds})} tickers.",
    }

    summary = {
        "date": date_str,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "narrator": SUMMARY_MODEL_ID if llm_narrative else None,
        **narrative,
        "consensus_picks": facts["consensus_picks"],
        "best_call": facts["best_call"],
        "worst_call": facts["worst_call"],
    }
    save_json(out_file, summary)
    sync_to_public(out_file)
    log.info(f"Daily summary saved for {date_str}")
    return summary


# ── Weekly summary ─────────────────────────────────────────────────────────────

def _week_scores(monday: date) -> tuple[list[dict], list[dict]]:
    """Return (all resolved results with dates, per-model score rows ranked)."""
    results = []
    for i in range(5):
        d = monday + timedelta(days=i)
        sf = SCORES_DIR / f"{d.isoformat()}.json"
        if sf.exists():
            for r in load_json(sf).get("results", []):
                if r.get("status") == "resolved":
                    results.append({**r, "date": d.isoformat()})

    per_model = defaultdict(lambda: {"score": 0.0, "predictions": 0, "correct": 0})
    for r in results:
        m = per_model[r["model_display_name"]]
        m["score"] += r["score"]
        m["predictions"] += 1
        m["correct"] += int(bool(r["direction_correct"]))
    rows = [
        {
            "model": model,
            "weekly_score": round(s["score"], 2),
            "predictions": s["predictions"],
            "accuracy": round(s["correct"] / s["predictions"], 4) if s["predictions"] else 0.0,
        }
        for model, s in per_model.items()
    ]
    rows.sort(key=lambda r: r["weekly_score"], reverse=True)
    return results, rows


def build_weekly_summary(week_str: str, force: bool = False) -> dict | None:
    """week_str like '2025-W08'"""
    out_file = SUMMARIES_WEEKLY_DIR / f"{week_str}.json"
    if out_file.exists() and not force:
        log.info(f"Weekly summary already exists for {week_str}")
        return load_json(out_file)

    year, wn = (int(x) for x in week_str.split("-W"))
    monday = date.fromisocalendar(year, wn, 1)
    friday = monday + timedelta(days=4)
    log.info(f"Summarizing week {week_str}: {monday} to {friday}")

    results, scores = _week_scores(monday)
    if not results:
        log.warning(f"No scores found for week {week_str}")
        return None

    # Rank change vs the previous week
    _, prev_scores = _week_scores(monday - timedelta(days=7))
    prev_rank = {r["model"]: i for i, r in enumerate(prev_scores)}
    for i, row in enumerate(scores):
        row["rank_change"] = prev_rank[row["model"]] - i if row["model"] in prev_rank else 0

    best = max(results, key=lambda r: r["score"])
    worst = min(results, key=lambda r: r["score"])

    # Consensus accuracy: same day + ticker, 2+ models, all same direction
    groups = defaultdict(list)
    for r in results:
        groups[(r["date"], r["ticker"])].append(r)
    consensus_total = consensus_correct = 0
    for picks in groups.values():
        if len(picks) >= 2 and len({p["predicted_direction"] for p in picks}) == 1:
            consensus_total += 1
            # Judge by majority outcome — baselines can differ by a few cents per model
            if sum(p["direction_correct"] for p in picks) * 2 > len(picks):
                consensus_correct += 1

    def call(r: dict, label: str) -> dict:
        return {
            "model": r["model_display_name"],
            "ticker": r["ticker"],
            "score": r["score"],
            "summary": f"{r['model_display_name']} called {r['ticker']} {r['predicted_direction']} "
                       f"on {r['date']}: {label} single call of the week.",
        }

    facts = {
        "week": week_str,
        "scores": scores,
        "best_call": call(best, "the top"),
        "worst_call": call(worst, "the lowest"),
        "consensus_accuracy": {
            "total_consensus_calls": consensus_total,
            "consensus_correct": consensus_correct,
            "accuracy": round(consensus_correct / consensus_total, 4) if consensus_total else 0.0,
        },
    }

    narrative = write_narrative(facts, "weekly") or {
        "headline": f"{scores[0]['model']} led {week_str} with {scores[0]['weekly_score']:+.2f} points",
        "summary": f"{len(results)} predictions were scored across {len(scores)} models this week.",
    }

    summary = {
        "week": week_str,
        "period": f"{monday:%b} {monday.day} – {friday:%b} {friday.day}, {friday.year}",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        **narrative,
        **facts,
    }
    save_json(out_file, summary)
    sync_to_public(out_file)
    log.info(f"Weekly summary saved for {week_str}")
    return summary


def update_weeks_index():
    """Rebuild data/weeks-index.json from files on disk."""
    weeks = sorted(f.stem for f in SUMMARIES_WEEKLY_DIR.glob("*.json"))
    idx_file = DATA_DIR / "weeks-index.json"
    save_json(idx_file, weeks)
    sync_to_public(idx_file)
    log.info(f"weeks-index.json updated: {weeks}")


def last_completed_week(today: date) -> str:
    """ISO week of the most recent Friday on or before today (Saturday → this week)."""
    friday = today - timedelta(days=(today.weekday() - 4) % 7)
    cal = friday.isocalendar()
    return f"{cal.year}-W{cal.week:02d}"


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
        week_str = args.week or last_completed_week(today_et())
        result = build_weekly_summary(week_str, force=args.force)
        if result:
            update_weeks_index()
            log.info(f"Weekly summary: {result.get('headline', 'done')}")
        else:
            log.warning("No data available for weekly summary — skipping")
            sys.exit(0)


if __name__ == "__main__":
    main()
