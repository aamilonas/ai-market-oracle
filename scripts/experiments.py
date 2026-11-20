"""
Timing experiment: the same consensus trade, picked at two times of day, next to
two simple rules that need no AI.

  premarket  the 9:00 AM ET run (before the open). Buy at the 9:30 open.
  late       a second run of every model at 10:00 AM ET. Buy at the live price
             fetched once every model has answered, which is the price you could
             really have traded at.
  spy        benchmark: buy SPY at the open, sell at the close, every trading day.
  trend      benchmark: the watchlist stock that moved most yesterday, bet that it
             keeps going, open to close, every trading day.

Each strategy starts with $25,000 on START_DATE, holds one all-in position a day
(whole shares) and sells at the 4:00 PM close. The model sides use the paper
simulator's consensus rule (winner.select_todays_winner): no consensus, no trade.
No commissions, slippage or overnight holds.

A day's pick is locked the first time it is recorded, so a later manual rerun can
never replace it. A model side only trades when its run landed inside its time
window; otherwise the day is logged as skipped with the reason.

Usage (evening, after score.py):
    python experiments.py [--date YYYY-MM-DD]
"""

from __future__ import annotations

import argparse
import math
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent))

from utils import (
    DATA_DIR,
    PREDICTIONS_DIR,
    RUNS_DIR,
    get_logger,
    is_market_open,
    load_json,
    save_json,
    sync_to_public,
    today_et,
)

log = get_logger("experiments")
ET = ZoneInfo("America/New_York")

START_DATE = "2026-11-23"
STARTING_BALANCE = 25000
TARGET_TRADES = 25  # roughly how many trades a side needs before the comparison means much

EXPERIMENTS_DIR = DATA_DIR / "experiments"
TIMING_FILE = EXPERIMENTS_DIR / "timing.json"
LATE_PREDICTIONS_DIR = EXPERIMENTS_DIR / "late" / "predictions"
LATE_RUNS_DIR = EXPERIMENTS_DIR / "late" / "runs"

MODEL_ARMS = ("premarket", "late")
BENCHMARK_ARMS = ("spy", "trend")
ARMS = MODEL_ARMS + BENCHMARK_ARMS

# When each model side's answers must land, in minutes after midnight ET.
PICK_WINDOWS = {
    "premarket": (0, 9 * 60 + 30),             # before the 9:30 open
    "late": (9 * 60 + 45, 11 * 60),            # 9:45 to 11:00 AM
}
SETTLE_AFTER = 16 * 60 + 10  # today's bars are final a little after the close

TREND_UNIVERSE = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META"]


# ── State ──────────────────────────────────────────────────────────────────────

def _empty_state() -> dict:
    return {
        "start_date": START_DATE,
        "starting_balance": STARTING_BALANCE,
        "target_trades": TARGET_TRADES,
        "updated_at": None,
        "arms": {
            arm: {"balance": STARTING_BALANCE, "trades": [], "skipped": []}
            for arm in ARMS
        },
        "prediction_stats": {arm: {} for arm in MODEL_ARMS},
    }


def load_state() -> dict:
    state = _empty_state()
    if TIMING_FILE.exists():
        try:
            saved = load_json(TIMING_FILE)
        except Exception as e:
            log.error(f"Could not load {TIMING_FILE}: {e}")
            raise
        for arm in ARMS:
            state["arms"][arm].update(saved.get("arms", {}).get(arm, {}))
        for arm in MODEL_ARMS:
            state["prediction_stats"][arm] = saved.get("prediction_stats", {}).get(arm, {})
        state["updated_at"] = saved.get("updated_at")
    return state


def save_state(state: dict) -> None:
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    for arm in ARMS:
        _recompute_ledger(state["arms"][arm])
    save_json(TIMING_FILE, state)
    sync_to_public(TIMING_FILE)


def _day_taken(arm_state: dict, date_str: str) -> bool:
    return any(t["date"] == date_str for t in arm_state["trades"]) or any(
        s["date"] == date_str for s in arm_state["skipped"]
    )


def _skip(arm_state: dict, date_str: str, reason: str) -> None:
    arm_state["skipped"].append({"date": date_str, "reason": reason})
    arm_state["skipped"].sort(key=lambda s: s["date"])


def _recompute_ledger(arm_state: dict) -> None:
    """Size every trade from the running balance and roll the P&L forward."""
    balance = STARTING_BALANCE
    for trade in sorted(arm_state["trades"], key=lambda t: t["date"]):
        entry = trade.get("entry_price")
        shares = int(balance / entry) if entry else None
        trade["shares"] = shares
        if trade["status"] != "CLOSED" or not shares:
            trade["pnl"] = trade["pnl_pct"] = None
            trade["balance_after"] = None
            continue
        move = trade["exit_price"] - entry
        pnl = move * shares if trade["direction"] == "up" else -move * shares
        trade["pnl"] = round(pnl, 2)
        trade["pnl_pct"] = round(pnl / (entry * shares) * 100, 2)
        balance = round(balance + pnl, 2)
        trade["balance_after"] = balance
    arm_state["trades"].sort(key=lambda t: t["date"])
    arm_state["balance"] = balance


def _minutes(dt: datetime) -> int:
    return dt.hour * 60 + dt.minute


def _in_window(arm: str, dt_et: datetime) -> bool:
    lo, hi = PICK_WINDOWS[arm]
    return lo <= _minutes(dt_et) < hi


# ── Morning / 10 AM: record a model side's pick ───────────────────────────────

def record_model_pick(arm: str, date_str: str, winner: dict | None, now: datetime | None = None) -> None:
    """Record a model side's consensus pick for the day (first record wins)."""
    if arm not in MODEL_ARMS:
        raise ValueError(f"not a model arm: {arm}")
    if date_str < START_DATE:
        return
    now_et = (now or datetime.now(timezone.utc)).astimezone(ET)
    if now_et.date().isoformat() != date_str:
        log.info(f"{arm}: {date_str} is not today, so it can't be traded honestly — not recorded")
        return

    state = load_state()
    arm_state = state["arms"][arm]
    if _day_taken(arm_state, date_str):
        log.info(f"{arm}: {date_str} already recorded — keeping the first pick")
        return

    if not _in_window(arm, now_et):
        when = now_et.strftime("%I:%M %p").lstrip("0")
        window = "after the 9:30 open" if arm == "premarket" else "outside the 9:45–11:00 AM window"
        _skip(arm_state, date_str, f"Picks came in at {when} ET, {window}")
        log.warning(f"{arm}: pick at {now_et:%H:%M} ET is outside the window — day skipped")
        save_state(state)
        return

    if not winner:
        _skip(arm_state, date_str, "No consensus: no stock had enough models agreeing")
        log.info(f"{arm}: no consensus — no trade")
        save_state(state)
        return

    ticker = winner.get("leveraged_ticker", winner["ticker"])
    trade = {
        "date": date_str,
        "ticker": ticker,
        "signal_ticker": winner["ticker"],
        "direction": winner["direction"],
        "models": winner["models"],
        "model_count": winner["model_count"],
        "confidence": winner["avg_confidence"],
        "picked_at": now_et.isoformat(timespec="seconds"),
        "entry_price": None,
        "entry_rule": "open" if arm == "premarket" else "pick_time",
        "entry_at": None,
        "exit_price": None,
        "status": "OPEN",
    }
    if arm == "late":
        from market_data import get_current_price
        price = get_current_price(ticker)
        if not price:
            _skip(arm_state, date_str, f"No live price for {ticker} at pick time")
            log.error(f"late: no live price for {ticker} — day skipped")
            save_state(state)
            return
        trade["entry_price"] = price
        trade["entry_at"] = datetime.now(timezone.utc).astimezone(ET).isoformat(timespec="seconds")

    arm_state["trades"].append(trade)
    fill = f"@ ${trade['entry_price']:.2f}" if trade["entry_price"] else "at the 9:30 open"
    log.info(f"{arm}: {trade['direction'].upper()} {ticker} {fill} ({trade['model_count']} models)")
    save_state(state)


# ── Evening: settle trades, run the benchmarks, score every prediction ────────

def _settleable(day: date, now_et: datetime) -> bool:
    if day < now_et.date():
        return True
    return day == now_et.date() and _minutes(now_et) >= SETTLE_AFTER


def _trading_days(start: date, end: date) -> list[date]:
    days, d = [], start
    while d <= end:
        if is_market_open(d):
            days.append(d)
        d += timedelta(days=1)
    return days


def _clean(x) -> float | None:
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(x) or math.isinf(x) or x <= 0 else round(x, 2)


def daily_bars(tickers: list[str], start: date, end: date) -> dict[str, dict[str, dict]]:
    """{ticker: {"YYYY-MM-DD": {"open", "close"}}} of regular-session daily bars."""
    import yfinance as yf
    tickers = sorted(set(tickers))
    bars: dict[str, dict[str, dict]] = {t: {} for t in tickers}
    if not tickers:
        return bars
    data = yf.download(
        tickers, start=start.isoformat(), end=(end + timedelta(days=1)).isoformat(),
        progress=False, group_by="ticker", auto_adjust=True,
    )
    for t in tickers:
        try:
            frame = data[t] if len(tickers) > 1 else data
        except KeyError:
            continue
        for idx, row in frame.iterrows():
            o, c = _clean(row.get("Open")), _clean(row.get("Close"))
            if o and c:
                bars[t][idx.date().isoformat()] = {"open": o, "close": c}
    return bars


def _settle_model_trades(state: dict, through: date, now_et: datetime) -> None:
    from market_data import get_closing_price, get_open_price
    for arm in MODEL_ARMS:
        for trade in state["arms"][arm]["trades"]:
            day = date.fromisoformat(trade["date"])
            if trade["status"] != "OPEN" or day > through or not _settleable(day, now_et):
                continue
            if trade["entry_price"] is None:
                entry = _clean(get_open_price(trade["ticker"], day))
                if not entry:
                    log.warning(f"{arm}: no open for {trade['ticker']} on {day} — stays open")
                    continue
                trade["entry_price"] = entry
                trade["entry_at"] = datetime(day.year, day.month, day.day, 9, 30, tzinfo=ET).isoformat()
            exit_px = _clean(get_closing_price(trade["ticker"], day))
            if not exit_px:
                log.warning(f"{arm}: no close for {trade['ticker']} on {day} — stays open")
                continue
            trade["exit_price"] = exit_px
            trade["status"] = "CLOSED"
            log.info(f"{arm}: closed {trade['ticker']} {day} ${trade['entry_price']:.2f} → ${exit_px:.2f}")


def _mark_missed_days(state: dict, days: list[date]) -> None:
    """A model side with nothing recorded for a past day missed its run."""
    for arm in MODEL_ARMS:
        arm_state = state["arms"][arm]
        for d in days:
            if not _day_taken(arm_state, d.isoformat()):
                _skip(arm_state, d.isoformat(), "No pick recorded: the run failed or never ran")
                log.warning(f"{arm}: no pick recorded for {d} — marked missed")


def _benchmark_trades(state: dict, days: list[date], bars: dict) -> None:
    spy_state, trend_state = state["arms"]["spy"], state["arms"]["trend"]
    for d in days:
        ds = d.isoformat()
        if not _day_taken(spy_state, ds) and ds in bars.get("SPY", {}):
            b = bars["SPY"][ds]
            spy_state["trades"].append({
                "date": ds, "ticker": "SPY", "direction": "up",
                "entry_price": b["open"], "exit_price": b["close"], "status": "CLOSED",
            })

        if _day_taken(trend_state, ds):
            continue
        moves = []
        for t in TREND_UNIVERSE:
            series = bars.get(t, {})
            prior = sorted(k for k in series if k < ds)[-2:]
            if len(prior) < 2 or ds not in series:
                continue
            prev2, prev1 = series[prior[0]]["close"], series[prior[1]]["close"]
            moves.append((abs(prev1 / prev2 - 1), t, (prev1 / prev2 - 1) * 100))
        if not moves:
            continue
        _, t, move = max(moves)
        b = bars[t][ds]
        trend_state["trades"].append({
            "date": ds, "ticker": t, "direction": "up" if move > 0 else "down",
            "signal": f"{t} {move:+.2f}% the day before",
            "entry_price": b["open"], "exit_price": b["close"], "status": "CLOSED",
        })


def _load_day(pred_root: Path, runs_root: Path, ds: str) -> tuple[list[dict], dict]:
    files = sorted((pred_root / ds).glob("*.json")) if (pred_root / ds).exists() else []
    payloads = []
    for f in files:
        try:
            payloads.append(load_json(f))
        except Exception as e:
            log.error(f"Could not load {f}: {e}")
    run_file = runs_root / f"{ds}.json"
    run = load_json(run_file) if run_file.exists() else {}
    return payloads, run


def _parse_time(value) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value)).astimezone(ET)
    except (TypeError, ValueError):
        return None


def _tradeable(ticker: str) -> bool:
    return not ticker.endswith("-USD") and not ticker.startswith("^") and ticker != "VIX"


def _prediction_stats(state: dict, days: list[date], bars: dict, loaded: dict) -> None:
    """Every prediction, measured from the price you could have bought at to the close."""
    for arm in MODEL_ARMS:
        stats = state["prediction_stats"][arm]
        for d in days:
            ds = d.isoformat()
            payloads, run = loaded[arm].get(ds, ([], {}))
            post_snap = run.get("post_answer_snapshot") or {}
            post = post_snap.get("quotes") or {}
            post_at = _parse_time(post_snap.get("fetched_at"))

            day_stats: dict[str, dict] = {}
            for payload in payloads:
                slug = payload.get("slug")
                answered = _parse_time(payload.get("generated_at"))
                if not answered or answered.date().isoformat() != ds or not _in_window(arm, answered):
                    continue  # answered outside this side's window, so it isn't this strategy
                # The post-answer prices only count for answers that arrived before them
                use_post = bool(post_at and post_at >= answered)
                for p in payload.get("predictions", []):
                    t = p.get("ticker", "")
                    if not _tradeable(t):
                        continue
                    bar = bars.get(t, {}).get(ds)
                    if not bar:
                        continue
                    if arm == "premarket":
                        entry = bar["open"]
                    else:
                        entry = (use_post and _clean((post.get(t) or {}).get("last"))) \
                            or _clean(p.get("current_price_at_prediction"))
                    if not entry:
                        continue
                    sign = 1 if p.get("direction") == "up" else -1
                    ret = (bar["close"] - entry) / entry * 100 * sign
                    s = day_stats.setdefault(slug, {"n": 0, "hits": 0, "ret": 0.0})
                    s["n"] += 1
                    s["hits"] += int(ret > 0)
                    s["ret"] = round(s["ret"] + ret, 4)
            if day_stats:
                stats[ds] = dict(sorted(day_stats.items()))


def settle(date_str: str) -> None:
    now_et = datetime.now(timezone.utc).astimezone(ET)
    through = date.fromisoformat(date_str)
    start = date.fromisoformat(START_DATE)
    state = load_state()
    if through < start:
        log.info(f"{date_str} is before the experiment starts ({START_DATE}) — nothing to do")
        save_state(state)
        return

    days = [d for d in _trading_days(start, through) if _settleable(d, now_et)]
    _settle_model_trades(state, through, now_et)
    _mark_missed_days(state, days)

    loaded = {
        "premarket": {d.isoformat(): _load_day(PREDICTIONS_DIR, RUNS_DIR, d.isoformat()) for d in days},
        "late": {d.isoformat(): _load_day(LATE_PREDICTIONS_DIR, LATE_RUNS_DIR, d.isoformat()) for d in days},
    }
    tickers = {"SPY", *TREND_UNIVERSE}
    for arm_days in loaded.values():
        for payloads, _run in arm_days.values():
            for payload in payloads:
                tickers.update(p["ticker"] for p in payload.get("predictions", []) if _tradeable(p.get("ticker", "")))

    if days:
        try:
            bars = daily_bars(sorted(tickers), start - timedelta(days=10), through)
        except Exception as e:
            log.error(f"Could not download daily bars: {e} — benchmarks and prediction stats not updated")
            bars = None
        if bars is not None:
            _benchmark_trades(state, days, bars)
            _prediction_stats(state, days, bars, loaded)

    save_state(state)
    for arm in ARMS:
        a = state["arms"][arm]
        closed = sum(1 for t in a["trades"] if t["status"] == "CLOSED")
        log.info(f"{arm:>9}: ${a['balance']:,.2f}  ({closed} closed trades, {len(a['skipped'])} days skipped)")


def main():
    parser = argparse.ArgumentParser(description="Settle the timing experiment")
    parser.add_argument("--date", default=today_et().isoformat(), help="Settle through this date (YYYY-MM-DD)")
    args = parser.parse_args()
    settle(args.date)


if __name__ == "__main__":
    main()
