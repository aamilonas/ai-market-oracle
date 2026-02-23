"""Fetch sports game results via The Odds API."""

import os
import re
from datetime import date, datetime
from typing import Optional

import requests

from utils import get_logger

log = get_logger("sports_data")

ODDS_API_BASE = "https://api.the-odds-api.com/v4"

# Mapping from our sport keys to Odds API sport keys
SPORT_KEY_MAP = {
    "basketball_nba": "basketball_nba",
    "football_nfl": "americanfootball_nfl",
    "baseball_mlb": "baseball_mlb",
    "hockey_nhl": "icehockey_nhl",
    "soccer_epl": "soccer_epl",
    "soccer_mls": "soccer_usa_mls",
}

# Common team name abbreviations/aliases for fuzzy matching
TEAM_ALIASES = {
    # NBA
    "lakers": "los angeles lakers",
    "celtics": "boston celtics",
    "warriors": "golden state warriors",
    "nets": "brooklyn nets",
    "knicks": "new york knicks",
    "76ers": "philadelphia 76ers",
    "sixers": "philadelphia 76ers",
    "bucks": "milwaukee bucks",
    "heat": "miami heat",
    "bulls": "chicago bulls",
    "suns": "phoenix suns",
    "mavs": "dallas mavericks",
    "mavericks": "dallas mavericks",
    "nuggets": "denver nuggets",
    "clippers": "la clippers",
    "thunder": "oklahoma city thunder",
    "cavaliers": "cleveland cavaliers",
    "cavs": "cleveland cavaliers",
    "timberwolves": "minnesota timberwolves",
    "wolves": "minnesota timberwolves",
    "kings": "sacramento kings",
    "pelicans": "new orleans pelicans",
    "hawks": "atlanta hawks",
    "raptors": "toronto raptors",
    "pacers": "indiana pacers",
    "magic": "orlando magic",
    "spurs": "san antonio spurs",
    "grizzlies": "memphis grizzlies",
    "blazers": "portland trail blazers",
    "trail blazers": "portland trail blazers",
    "hornets": "charlotte hornets",
    "pistons": "detroit pistons",
    "rockets": "houston rockets",
    "jazz": "utah jazz",
    "wizards": "washington wizards",
    # NFL
    "chiefs": "kansas city chiefs",
    "eagles": "philadelphia eagles",
    "bills": "buffalo bills",
    "cowboys": "dallas cowboys",
    "49ers": "san francisco 49ers",
    "niners": "san francisco 49ers",
    "ravens": "baltimore ravens",
    "lions": "detroit lions",
    "dolphins": "miami dolphins",
    "bengals": "cincinnati bengals",
    "packers": "green bay packers",
    "texans": "houston texans",
    "steelers": "pittsburgh steelers",
    "seahawks": "seattle seahawks",
    "jaguars": "jacksonville jaguars",
    "vikings": "minnesota vikings",
    "chargers": "los angeles chargers",
    "rams": "los angeles rams",
    "broncos": "denver broncos",
    "saints": "new orleans saints",
    "colts": "indianapolis colts",
    "browns": "cleveland browns",
    "bears": "chicago bears",
    "commanders": "washington commanders",
    "panthers": "carolina panthers",
    "falcons": "atlanta falcons",
    "raiders": "las vegas raiders",
    "titans": "tennessee titans",
    "cardinals": "arizona cardinals",
    "patriots": "new england patriots",
    "giants": "new york giants",
    "jets": "new york jets",
    "buccaneers": "tampa bay buccaneers",
    "bucs": "tampa bay buccaneers",
    # NHL
    "bruins": "boston bruins",
    "maple leafs": "toronto maple leafs",
    "leafs": "toronto maple leafs",
    "canadiens": "montreal canadiens",
    "habs": "montreal canadiens",
    "red wings": "detroit red wings",
    "blackhawks": "chicago blackhawks",
    "penguins": "pittsburgh penguins",
    "flyers": "philadelphia flyers",
    "rangers": "new york rangers",
    "islanders": "new york islanders",
    "capitals": "washington capitals",
    "caps": "washington capitals",
    "lightning": "tampa bay lightning",
    "avalanche": "colorado avalanche",
    "oilers": "edmonton oilers",
    "flames": "calgary flames",
    "canucks": "vancouver canucks",
    "sharks": "san jose sharks",
    "wild": "minnesota wild",
    "blues": "st. louis blues",
    "predators": "nashville predators",
    "preds": "nashville predators",
    "hurricanes": "carolina hurricanes",
    "canes": "carolina hurricanes",
    "stars": "dallas stars",
    "panthers_nhl": "florida panthers",
    "kraken": "seattle kraken",
    "golden knights": "vegas golden knights",
    "knights": "vegas golden knights",
    "ducks": "anaheim ducks",
    "coyotes": "arizona coyotes",
    "senators": "ottawa senators",
    "sens": "ottawa senators",
    "jets_nhl": "winnipeg jets",
    "sabres": "buffalo sabres",
    "jackets": "columbus blue jackets",
    "blue jackets": "columbus blue jackets",
    "devils": "new jersey devils",
}


def normalize_team_name(name: str) -> str:
    """Normalize a team name for fuzzy matching."""
    name = name.lower().strip()
    # Check aliases
    if name in TEAM_ALIASES:
        return TEAM_ALIASES[name]
    # Check if any alias value matches
    for alias, full in TEAM_ALIASES.items():
        if name == full:
            return full
    return name


def _teams_match(predicted: str, actual: str) -> bool:
    """Check if a predicted team name matches an actual team name."""
    return normalize_team_name(predicted) == normalize_team_name(actual)


def get_game_result(sport: str, home_team: str, away_team: str, game_date: date) -> Optional[str]:
    """
    Look up the result of a specific game via The Odds API.
    Returns the winning team name, or None if the game hasn't finished.
    """
    api_key = os.environ.get("ODDS_API_KEY")
    if not api_key:
        log.error("ODDS_API_KEY not set")
        return None

    odds_sport = SPORT_KEY_MAP.get(sport)
    if not odds_sport:
        log.error(f"Unknown sport key: {sport}")
        return None

    # Fetch completed events (scores)
    url = f"{ODDS_API_BASE}/sports/{odds_sport}/scores/"
    params = {
        "apiKey": api_key,
        "daysFrom": 1,
        "dateFormat": "iso",
    }

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        events = resp.json()
    except Exception as e:
        log.error(f"Odds API request failed: {e}")
        return None

    # Find the matching game
    for event in events:
        commence = event.get("commence_time", "")
        if not commence:
            continue

        event_date = datetime.fromisoformat(commence.replace("Z", "+00:00")).date()
        if event_date != game_date:
            continue

        event_home = event.get("home_team", "")
        event_away = event.get("away_team", "")

        if (_teams_match(home_team, event_home) and _teams_match(away_team, event_away)) or \
           (_teams_match(home_team, event_away) and _teams_match(away_team, event_home)):

            if not event.get("completed", False):
                log.info(f"Game {home_team} vs {away_team} not yet completed")
                return None

            scores = event.get("scores")
            if not scores or len(scores) < 2:
                log.warning(f"No scores data for {home_team} vs {away_team}")
                return None

            # Parse scores
            score_map = {}
            for s in scores:
                try:
                    score_map[s["name"]] = int(s["score"])
                except (KeyError, ValueError, TypeError):
                    continue

            if len(score_map) < 2:
                return None

            # Determine winner
            teams = list(score_map.keys())
            if score_map[teams[0]] > score_map[teams[1]]:
                winner = teams[0]
            elif score_map[teams[1]] > score_map[teams[0]]:
                winner = teams[1]
            else:
                winner = "draw"

            log.info(f"Game result: {teams[0]} {score_map[teams[0]]} - {teams[1]} {score_map[teams[1]]} → winner: {winner}")
            return winner

    log.info(f"No matching game found for {home_team} vs {away_team} on {game_date}")
    return None
