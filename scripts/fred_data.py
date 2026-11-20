"""Today's scheduled U.S. economic releases, for the prompt's economic-calendar block.

A same-day call is most exposed to the market-moving releases: CPI, the jobs report,
an FOMC decision. The morning run is at 9:00 AM ET, after the 8:30 releases, so the
block says which have already come out and which are still to come.

Release dates come from FRED's release calendar and need FRED_API_KEY (free:
https://fred.stlouisfed.org/docs/api/api_key.html). FOMC decisions come from the Fed's
published meeting schedule instead, because FRED's "FOMC Press Release" calendar also
marks plain data updates on days with no meeting.

(Until 2026-11-20 this module fetched six macro series instead: yields, Fed Funds, CPI,
unemployment. No scheduled run ever had a key, so models never received them.)
"""

from __future__ import annotations

import os
from datetime import date, datetime, time as dtime
from typing import Optional

import requests

from utils import get_logger

log = get_logger("fred_data")

FRED_RELEASE_DATES = "https://api.stlouisfed.org/fred/releases/dates"

# FRED release id -> (label shown to models, usual release time ET).
# Ids verified against fred.stlouisfed.org/release?rid=N on 2026-11-20.
MAJOR_RELEASES = {
    10: ("Consumer Price Index (CPI)", dtime(8, 30)),
    50: ("Employment Situation (jobs report)", dtime(8, 30)),
    46: ("Producer Price Index (PPI)", dtime(8, 30)),
    53: ("Gross Domestic Product (GDP)", dtime(8, 30)),
    54: ("Personal Income and Outlays (PCE inflation)", dtime(8, 30)),
    9: ("Retail Sales", dtime(8, 30)),
    180: ("Weekly Jobless Claims", dtime(8, 30)),
    27: ("Housing Starts", dtime(8, 30)),
    13: ("Industrial Production", dtime(9, 15)),
    192: ("JOLTS Job Openings", dtime(10, 0)),
    97: ("New Home Sales", dtime(10, 0)),
}

# FOMC rate decisions (second day of each meeting), statement at 2:00 PM ET.
# From federalreserve.gov/monetarypolicy/fomccalendars.htm. Add each new year's
# dates when the Fed publishes them; a missing year is logged on every run.
FOMC_DECISIONS = {
    "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17",
    "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
}
FOMC_LABEL = "FOMC rate decision (press conference 2:30 PM)"
FOMC_TIME = dtime(14, 0)


def _fred_release_ids(day: date, api_key: str) -> Optional[set[int]]:
    """Ids of every FRED release scheduled on `day`, or None if the lookup failed."""
    try:
        resp = requests.get(
            FRED_RELEASE_DATES,
            params={
                "api_key": api_key,
                "file_type": "json",
                "realtime_start": day.isoformat(),
                "realtime_end": day.isoformat(),
                # Without this FRED leaves out dates whose data isn't published yet.
                "include_release_dates_with_no_data": "true",
                "limit": 1000,
            },
            timeout=15,
        )
    except requests.RequestException as e:
        # Log only the exception type: the message can contain the URL, key included.
        log.warning(f"FRED release calendar unreachable ({type(e).__name__})")
        return None
    if resp.status_code != 200:
        log.warning(f"FRED release calendar returned HTTP {resp.status_code}")
        return None
    try:
        items = resp.json().get("release_dates") or []
        return {int(i["release_id"]) for i in items if i.get("date") == day.isoformat()}
    except (ValueError, KeyError, TypeError) as e:
        log.warning(f"FRED release calendar: unexpected response ({type(e).__name__})")
        return None


def get_release_calendar(day: date, now_et: Optional[datetime] = None) -> str:
    """The economic-calendar block for the prompt, or "" when it can't be built.

    With FRED available the block is complete, including an explicit "nothing major
    today". Without it, only an FOMC decision can be reported, and the block is
    otherwise left out rather than implying a quiet day.
    """
    from zoneinfo import ZoneInfo
    now_et = now_et or datetime.now(ZoneInfo("America/New_York"))

    fomc_known = any(d.startswith(f"{day.year}-") for d in FOMC_DECISIONS)
    if not fomc_known:
        log.warning(f"No FOMC dates for {day.year} in fred_data.FOMC_DECISIONS — add them")

    events = []  # (time, label)
    if day.isoformat() in FOMC_DECISIONS:
        events.append((FOMC_TIME, FOMC_LABEL))

    api_key = os.environ.get("FRED_API_KEY")
    released = None
    if not api_key:
        log.info("FRED_API_KEY not set — economic calendar limited to FOMC dates")
    else:
        released = _fred_release_ids(day, api_key)
    complete = released is not None
    for rid in sorted(released or ()):
        if rid in MAJOR_RELEASES:
            label, at = MAJOR_RELEASES[rid]
            events.append((at, label))

    if not events and not complete:
        return ""

    header = "ECONOMIC CALENDAR (scheduled U.S. releases today, Eastern time):"
    if not events:
        log.info("Economic calendar: no major releases today")
        nothing = "No major scheduled releases or FOMC decision today." if fomc_known else (
            "No major scheduled releases today.")
        return f"{header}\n  {nothing}"

    lines = [header]
    same_day = now_et.date() == day
    for at, label in sorted(events):
        clock = datetime.combine(day, at).strftime("%I:%M %p").lstrip("0")
        status = ""
        if same_day:
            status = " — already released" if now_et.time() >= at else " — later today"
        lines.append(f"  {clock:>8}  {label}{status}")
    if not complete:
        lines.append("  (Other scheduled releases could not be checked today.)")
    log.info(f"Economic calendar: {', '.join(label for _, label in sorted(events))}")
    return "\n".join(lines)
