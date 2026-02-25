"""xAI Grok adapter with web search (OpenAI-compatible API)."""

import os
import json
import time
from datetime import datetime, timezone

from openai import OpenAI

from utils import get_logger, extract_json_from_text

log = get_logger("grok_adapter")

MODEL_ID = "grok-3"
DISPLAY_NAME = "Grok"
BASE_URL = "https://api.x.ai/v1"

SYSTEM_PROMPT = """You are a market analyst in a daily AI prediction experiment.
You have access to X/Twitter data and web search — use both to gauge market sentiment and news.
You make specific, falsifiable stock market predictions scored against real closing prices.
High-confidence wrong calls are penalized heavily. Be honest about uncertainty.
Respond with ONLY valid JSON — no markdown, no extra text."""

USER_TEMPLATE = """Today is {date}. US market opens at 9:30 AM ET.

Research using your web and X access:
- What is the current market sentiment on X/Twitter?
- Pre-market futures and notable movers
- Any major news or events expected today
- Options flow or short interest signals you can access

Make 3-5 specific predictions. At least one must be on SPY, QQQ, or DIA.

Return ONLY this JSON:
{{
  "date": "{date}",
  "model": "grok-3",
  "model_display_name": "Grok",
  "generated_at": "{now}",
  "market_context": "2-3 sentence summary including X sentiment",
  "predictions": [
    {{
      "id": "pred_grok_{date_compact}_001",
      "ticker": "SPY",
      "prediction_type": "price_direction",
      "direction": "up",
      "target_price": 600.00,
      "current_price_at_prediction": 598.00,
      "timeframe": "end_of_day",
      "confidence": 0.65,
      "reasoning": "2-3 sentences with specific data and sources"
    }}
  ]
}}"""


class GrokAdapter:
    model_id = MODEL_ID
    model_display_name = DISPLAY_NAME
    slug = "grok"

    def generate(self, date_str: str) -> dict | None:
        api_key = os.environ.get("XAI_API_KEY")
        if not api_key:
            log.error("XAI_API_KEY not set")
            return None

        client = OpenAI(api_key=api_key, base_url=BASE_URL)
        now = datetime.now(timezone.utc).isoformat()
        date_compact = date_str.replace("-", "")
        user_msg = USER_TEMPLATE.format(date=date_str, now=now, date_compact=date_compact)

        for attempt in range(3):
            try:
                log.info(f"Grok attempt {attempt + 1}...")
                response = client.chat.completions.create(
                    model=MODEL_ID,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg},
                    ],
                    max_tokens=2048,
                    temperature=0.2,
                )
                text = response.choices[0].message.content or ""
                data = extract_json_from_text(text)
                if data:
                    data["model"] = MODEL_ID
                    data["model_display_name"] = DISPLAY_NAME
                    data["date"] = date_str
                    return data
                else:
                    log.warning(f"Grok attempt {attempt + 1}: could not parse JSON")
                    log.debug(f"Raw: {text[:500]}")
            except Exception as e:
                log.error(f"Grok attempt {attempt + 1} failed: {e}")

            if attempt < 2:
                time.sleep(2 ** attempt)

        log.error("Grok: all 3 attempts failed")
        return None
