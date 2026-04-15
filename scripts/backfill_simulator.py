"""
One-shot: rewrite simulator.json entry/exit prices using real yfinance data.

For each trade in data/simulator.json:
  - entry_price ← regular-session Open on trade date (yfinance)
  - exit_price  ← regular-session Close on trade date (yfinance)
  - shares recomputed from the running balance at trade time and the new entry
  - pnl / pnl_pct recomputed
  - final balance recomputed from starting_balance + cumulative pnl

Open trades keep exit_price/pnl null; only their entry is refreshed.

Usage: python scripts/backfill_simulator.py
"""

import sys
from datetime import date as date_cls
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from utils import get_logger, load_json, save_json, sync_to_public, DATA_DIR
from market_data import get_open_price, get_closing_price

log = get_logger("backfill_simulator")
SIMULATOR_FILE = DATA_DIR / "simulator.json"


def main():
    sim = load_json(SIMULATOR_FILE)
    starting_balance = sim.get("starting_balance", 25000)
    balance = starting_balance

    for trade in sim.get("trades", []):
        ticker = trade["ticker"]
        trade_date = date_cls.fromisoformat(trade["date"])
        direction = trade["direction"]
        status = trade.get("status", "OPEN")

        old_entry = trade.get("entry_price")
        new_entry = get_open_price(ticker, trade_date)
        if new_entry is None or new_entry <= 0:
            log.error(f"Could not fetch open price for {ticker} on {trade_date}; keeping old entry {old_entry}")
            new_entry = old_entry

        if new_entry is None or new_entry <= 0:
            log.error(f"No usable entry price for {ticker} on {trade_date}; skipping trade")
            continue

        # Size position from current running balance (consistent with open_trade logic).
        shares = int(balance / new_entry)
        if shares <= 0:
            log.warning(f"Insufficient balance ${balance:.2f} to buy {ticker} @ ${new_entry:.2f}")
            trade["entry_price"] = new_entry
            continue

        trade["entry_price"] = new_entry
        trade["shares"] = shares

        if status == "CLOSED":
            new_exit = get_closing_price(ticker, trade_date)
            if new_exit is None or new_exit <= 0:
                log.error(f"Could not fetch close for {ticker} on {trade_date}; keeping old exit")
                new_exit = trade.get("exit_price")
            if new_exit is None:
                log.error(f"No exit price for {ticker} — skipping P&L recompute")
                continue

            if direction == "up":
                pnl = (new_exit - new_entry) * shares
            else:
                pnl = (new_entry - new_exit) * shares

            pnl_pct = (pnl / (new_entry * shares)) * 100 if new_entry * shares else 0

            trade["exit_price"] = new_exit
            trade["pnl"] = round(pnl, 2)
            trade["pnl_pct"] = round(pnl_pct, 2)
            balance = round(balance + pnl, 2)

            log.info(
                f"{trade_date} {direction.upper()} {shares} {ticker} "
                f"${new_entry:.2f} → ${new_exit:.2f}  P&L ${pnl:+.2f} ({pnl_pct:+.2f}%)  balance=${balance:.2f}"
            )
        else:
            # OPEN trade — refresh entry only, keep pnl null
            trade["exit_price"] = None
            trade["pnl"] = None
            trade["pnl_pct"] = None
            log.info(f"{trade_date} OPEN {direction.upper()} {shares} {ticker} @ ${new_entry:.2f}")

    sim["balance"] = balance
    save_json(SIMULATOR_FILE, sim)
    sync_to_public(SIMULATOR_FILE)
    log.info(f"Backfill complete. Final balance: ${balance:.2f}")


if __name__ == "__main__":
    main()
