"""
Today's Winner selection and paper trading simulator.

Finds the highest-conviction individual stock pick where 4+ models agree
on direction, then manages simulated trades in data/simulator.json.
"""

import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from utils import (
    get_logger,
    load_json,
    save_json,
    sync_to_public,
    DATA_DIR,
    PREDICTIONS_DIR,
)

log = get_logger("winner")

EXCLUDED_TICKERS = {"SPY", "QQQ", "DIA", "VIX", "IWM"}
MIN_MODELS_AGREEING = 4
SIMULATOR_FILE = DATA_DIR / "simulator.json"
WINNER_FILE = DATA_DIR / "winner-today.json"

DEFAULT_SIMULATOR = {
    "balance": 25000,
    "starting_balance": 25000,
    "trades": [],
}

DEFAULT_WINNER = {
    "date": None,
    "winner": None,
}


def select_todays_winner(date_str):
    """Find the highest-conviction stock pick where 4+ models agree."""
    pred_dir = PREDICTIONS_DIR / date_str
    if not pred_dir.exists():
        log.warning(f"No predictions directory for {date_str}")
        return None

    pred_files = list(pred_dir.glob("*.json"))
    if not pred_files:
        log.warning(f"No prediction files for {date_str}")
        return None

    # Group by (ticker, direction)
    groups = defaultdict(list)
    for pf in pred_files:
        try:
            data = load_json(pf)
        except Exception as e:
            log.error(f"Could not load {pf}: {e}")
            continue

        model_name = data.get("model_display_name", pf.stem)
        for pred in data.get("predictions", []):
            ticker = pred.get("ticker", "")
            direction = pred.get("direction")
            target = pred.get("target_price")
            entry = pred.get("current_price_at_prediction")
            confidence = pred.get("confidence")

            # Skip non-stock picks
            if ticker in EXCLUDED_TICKERS:
                continue
            if ticker.endswith("-USD"):
                continue
            # Skip sports/missing price data
            if target is None or entry is None or confidence is None:
                continue
            if pred.get("category") == "sports":
                continue

            groups[(ticker, direction)].append({
                "model": model_name,
                "confidence": confidence,
                "target": target,
                "entry": entry,
            })

    # Filter for groups with enough models agreeing
    candidates = []
    for (ticker, direction), picks in groups.items():
        if len(picks) < MIN_MODELS_AGREEING:
            continue

        avg_confidence = sum(p["confidence"] for p in picks) / len(picks)
        avg_target = sum(p["target"] for p in picks) / len(picks)
        avg_entry = sum(p["entry"] for p in picks) / len(picks)

        if avg_entry == 0:
            continue

        expected_move_pct = abs((avg_target - avg_entry) / avg_entry * 100)
        score = avg_confidence * expected_move_pct

        candidates.append({
            "ticker": ticker,
            "direction": direction,
            "avg_confidence": round(avg_confidence, 4),
            "avg_target": round(avg_target, 2),
            "avg_entry": round(avg_entry, 2),
            "expected_move_pct": round(expected_move_pct, 2),
            "score": round(score, 4),
            "models": [p["model"] for p in picks],
            "model_count": len(picks),
            "high_conviction": avg_confidence >= 0.85,
        })

    if not candidates:
        log.info(f"No consensus winner for {date_str} (no ticker with {MIN_MODELS_AGREEING}+ models agreeing)")
        return None

    # Return highest-scoring candidate
    winner = max(candidates, key=lambda c: c["score"])
    log.info(
        f"Today's winner: {winner['ticker']} {winner['direction'].upper()} "
        f"({winner['model_count']} models, score={winner['score']:.2f})"
    )
    return winner


def load_simulator():
    """Load simulator state from file or return default."""
    if SIMULATOR_FILE.exists():
        try:
            return load_json(SIMULATOR_FILE)
        except Exception as e:
            log.error(f"Could not load simulator: {e}")
    return dict(DEFAULT_SIMULATOR)


def save_simulator(data):
    """Save simulator state and sync to public."""
    save_json(SIMULATOR_FILE, data)
    sync_to_public(SIMULATOR_FILE)


def save_winner(date_str, winner):
    """Save today's winner and sync to public."""
    data = {"date": date_str, "winner": winner}
    save_json(WINNER_FILE, data)
    sync_to_public(WINNER_FILE)


def has_open_trade(sim):
    """Check if there's an open trade in the simulator."""
    for trade in sim.get("trades", []):
        if trade.get("status") == "OPEN":
            return True
    return False


def open_trade(sim, winner, date_str):
    """Open a new paper trade based on today's winner."""
    if has_open_trade(sim):
        log.warning("Already have an open trade — skipping")
        return sim

    entry_price = winner["avg_entry"]
    if entry_price <= 0:
        log.warning("Invalid entry price — skipping trade")
        return sim

    balance = sim["balance"]
    shares = int(balance / entry_price)
    if shares <= 0:
        log.warning("Insufficient balance for trade")
        return sim

    trade = {
        "date": date_str,
        "ticker": winner["ticker"],
        "direction": winner["direction"],
        "entry_price": entry_price,
        "exit_price": None,
        "shares": shares,
        "pnl": None,
        "pnl_pct": None,
        "models": winner["models"],
        "confidence": winner["avg_confidence"],
        "status": "OPEN",
    }

    sim["trades"].append(trade)
    log.info(
        f"Opened trade: {winner['direction'].upper()} {shares} shares of "
        f"{winner['ticker']} @ ${entry_price:.2f}"
    )
    return sim


def close_trade(sim, closing_price):
    """Close the open paper trade with the closing price."""
    for trade in sim.get("trades", []):
        if trade.get("status") != "OPEN":
            continue

        trade["exit_price"] = closing_price
        entry = trade["entry_price"]
        shares = trade["shares"]

        if trade["direction"] == "up":
            pnl = (closing_price - entry) * shares
        else:
            pnl = (entry - closing_price) * shares

        pnl_pct = (pnl / (entry * shares)) * 100 if entry * shares != 0 else 0

        trade["pnl"] = round(pnl, 2)
        trade["pnl_pct"] = round(pnl_pct, 2)
        trade["status"] = "CLOSED"

        sim["balance"] = round(sim["balance"] + pnl, 2)

        log.info(
            f"Closed trade: {trade['ticker']} @ ${closing_price:.2f} — "
            f"P&L: ${pnl:+.2f} ({pnl_pct:+.2f}%)"
        )
        return sim

    log.warning("No open trade to close")
    return sim
