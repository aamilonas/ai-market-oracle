from __future__ import annotations

"""OpenAI GPT-4o adapter with web search tool."""

import os
import json
import re
import time
from datetime import datetime, timezone

from openai import OpenAI

from utils import get_logger, extract_json_from_text

log = get_logger("openai_adapter")

MODEL_ID = "gpt-4o-search-preview"
DISPLAY_NAME = "GPT-4o"

SYSTEM_PROMPT = """You are a market analyst in a daily AI prediction experiment.
You make specific, falsifiable stock market predictions that are scored against real closing prices.
You have web search access — use it to research current market conditions before predicting.
Be calibrated: high-confidence wrong calls are penalized heavily.
Respond with ONLY valid JSON — no markdown, no commentary."""

USER_TEMPLATE = """Today is {date}. US market opens at 9:30 AM ET.

Search for: pre-market futures, overnight news, economic calendar for today, notable pre-market movers.

Make 3-5 specific predictions. At least one must be on SPY, QQQ, or DIA.

Return ONLY this JSON (no markdown):
{{
  "date": "{date}",
  "model": "gpt-4o",
  "model_display_name": "GPT-4o",
  "generated_at": "{now}",
  "market_context": "2-3 sentence summary",
  "predictions": [
    {{
      "id": "pred_gpt4o_{date_compact}_001",
      "ticker": "SPY",
      "prediction_type": "price_direction",
      "direction": "up",
      "target_price": 600.00,
      "current_price_at_prediction": 598.00,
      "timeframe": "end_of_day",
      "confidence": 0.65,
      "reasoning": "2-3 sentences with specific data"
    }}
  ]
}}"""


REPAIR_MODEL = "gpt-4o"

JSON_REPAIR_TEMPLATE = """Convert the following market prediction draft into valid JSON.

Return ONLY a single valid JSON object matching this exact structure:
{{
  "date": "{date}",
  "model": "gpt-4o",
  "model_display_name": "GPT-4o",
  "generated_at": "{now}",
  "market_context": "2-3 sentence summary",
  "predictions": [
    {{
      "id": "pred_gpt4o_{date_compact}_001",
      "ticker": "SPY",
      "prediction_type": "price_direction",
      "direction": "up",
      "target_price": 600.00,
      "current_price_at_prediction": 598.00,
      "timeframe": "end_of_day",
      "confidence": 0.65,
      "reasoning": "2-3 sentences with specific data"
    }}
  ]
}}

Rules:
- Keep only 3 to 5 predictions.
- Preserve the original meaning as closely as possible.
- Use only `up` or `down` for direction.
- Use only `end_of_day`, `end_of_week`, or `end_of_month` for timeframe.
- Output JSON only.

Draft:
{raw_text}
"""


def _strip_search_citations(text: str) -> str:
    """Remove gpt-4o-search-preview inline citations that corrupt JSON.

    The search-preview model injects citations like 【4:0†source】,
    markdown links [text](url), and sometimes ASCII control characters
    into its response content.  These appear inside JSON string values
    and break parsing.
    """
    # Remove fullwidth-bracket citation markers: 【...】
    text = re.sub(r'【[^】]*】', '', text)
    # Remove markdown links: [text](url) → text
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
    # Remove bare footnote markers: [1], [2], etc.
    text = re.sub(r'\[\d+\]', '', text)
    # Remove ASCII control characters (except newline/tab) that corrupt JSON
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text


def _repair_to_json(client, raw_text: str, date_str: str, now: str, date_compact: str) -> dict | None:
    """Second-pass repair: use standard gpt-4o with JSON mode to fix malformed output."""
    prompt = JSON_REPAIR_TEMPLATE.format(
        date=date_str,
        now=now,
        date_compact=date_compact,
        raw_text=raw_text[:12000],
    )
    try:
        response = client.chat.completions.create(
            model=REPAIR_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=2048,
        )
        text = response.choices[0].message.content or ""
        return extract_json_from_text(text)
    except Exception as e:
        log.warning(f"GPT-4o repair pass failed: {e}")
        return None


class OpenAIAdapter:
    model_id = MODEL_ID
    model_display_name = DISPLAY_NAME
    slug = "gpt4o"

    def generate(self, date_str: str, market_context: str = "") -> dict | None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            log.error("OPENAI_API_KEY not set")
            return None

        client = OpenAI(api_key=api_key)
        now = datetime.now(timezone.utc).isoformat()
        date_compact = date_str.replace("-", "")
        user_msg = USER_TEMPLATE.format(date=date_str, now=now, date_compact=date_compact)
        if market_context:
            user_msg = f"{market_context}\n\n{user_msg}"

        for attempt in range(3):
            try:
                log.info(f"GPT-4o attempt {attempt + 1}...")
                response = client.chat.completions.create(
                    model=MODEL_ID,
                    web_search_options={},
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg},
                    ],
                    max_tokens=2048,
                )

                # Extract text from the search-preview response.
                # msg.content contains the text but may include inline
                # citations (【4:0†source】) injected by web_search_options.
                text = ""
                msg = response.choices[0].message
                if msg.content:
                    text = msg.content

                cleaned = _strip_search_citations(text)
                data = extract_json_from_text(cleaned)
                if data:
                    data["model"] = MODEL_ID
                    data["model_display_name"] = DISPLAY_NAME
                    data["date"] = date_str
                    return data
                else:
                    log.warning(f"GPT-4o attempt {attempt + 1}: could not parse JSON, trying repair pass")
                    log.info(f"Raw (first 500 chars): {text[:500]}")
                    repaired = _repair_to_json(client, cleaned or text, date_str, now, date_compact)
                    if repaired:
                        repaired["model"] = MODEL_ID
                        repaired["model_display_name"] = DISPLAY_NAME
                        repaired["date"] = date_str
                        return repaired
            except Exception as e:
                log.error(f"GPT-4o attempt {attempt + 1} failed: {e}")

            if attempt < 2:
                time.sleep(2 ** attempt)

        log.error("GPT-4o: all 3 attempts failed")
        return None
