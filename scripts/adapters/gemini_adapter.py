"""Google Gemini adapter with Google Search grounding (new google-genai SDK)."""

import os
import re
import time
from datetime import datetime, timezone

from google import genai
from google.genai import types

from utils import get_logger, extract_json_from_text

log = get_logger("gemini_adapter")

MODEL_ID = "gemini-2.5-flash"
DISPLAY_NAME = "Gemini"

PROMPT_TEMPLATE = """You are a market analyst participating in a daily AI prediction experiment.
Today is {date}. US market opens at 9:30 AM ET.

Use Google Search to research:
- Current pre-market futures and overnight moves
- Major economic events today
- Key stocks making moves in pre-market
- Any overnight news that could impact today's session

Then make 3-5 specific, falsifiable stock market predictions.
At least one prediction MUST be on SPY, QQQ, or DIA.
Confidence range: 0.50 (coin flip) to 0.95 (very high conviction).
High-confidence wrong calls are penalized heavily in scoring.

Respond with ONLY valid JSON — no markdown fences, no extra text:
{{
  "date": "{date}",
  "model": "{model_id}",
  "model_display_name": "Gemini",
  "generated_at": "{now}",
  "market_context": "2-3 sentence summary of what you found",
  "predictions": [
    {{
      "id": "pred_gemini_{date_compact}_001",
      "ticker": "SPY",
      "prediction_type": "price_direction",
      "direction": "up",
      "target_price": 600.00,
      "current_price_at_prediction": 598.00,
      "timeframe": "end_of_day",
      "confidence": 0.65,
      "reasoning": "Specific reasoning referencing data you found"
    }}
  ]
}}"""


def _clean_grounding_artifacts(text):
    """Strip Google Search grounding citations/markdown that corrupt JSON."""
    # Remove markdown links: [text](url) → text
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
    # Remove bare citation markers: [1], [2], etc.
    text = re.sub(r'\[\d+\]', '', text)
    return text"""


class GeminiAdapter:
    model_id = MODEL_ID
    model_display_name = DISPLAY_NAME
    slug = "gemini"

    def generate(self, date_str: str) -> dict | None:
        api_key = os.environ.get("GOOGLE_GEMINI_API_KEY")
        if not api_key:
            log.error("GOOGLE_GEMINI_API_KEY not set")
            return None

        client = genai.Client(api_key=api_key)
        now = datetime.now(timezone.utc).isoformat()
        date_compact = date_str.replace("-", "")

        prompt = PROMPT_TEMPLATE.format(
            date=date_str,
            model_id=MODEL_ID,
            now=now,
            date_compact=date_compact,
        )

        for attempt in range(3):
            try:
                log.info(f"Gemini attempt {attempt + 1}...")
                response = client.models.generate_content(
                    model=MODEL_ID,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                        max_output_tokens=2048,
                        tools=[
                            types.Tool(google_search=types.GoogleSearch()),
                        ],
                    ),
                )
                text = response.text or ""
                # Grounding can inject markdown links/citations — strip them
                cleaned = _clean_grounding_artifacts(text)
                data = extract_json_from_text(cleaned)
                if data:
                    data["model"] = MODEL_ID
                    data["model_display_name"] = DISPLAY_NAME
                    data["date"] = date_str
                    return data
                else:
                    log.warning(f"Gemini attempt {attempt + 1}: could not parse JSON")
                    log.info(f"Raw (first 500 chars): {text[:500]}")
            except Exception as e:
                log.error(f"Gemini attempt {attempt + 1} failed: {e}")

            if attempt < 2:
                time.sleep(2 ** attempt)

        log.error("Gemini: all 3 attempts failed")
        return None
