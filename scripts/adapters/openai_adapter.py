"""OpenAI GPT-4o adapter with web search tool."""

import os
import json
from datetime import datetime

from openai import OpenAI

from utils import get_logger, extract_json_from_text

log = get_logger("openai_adapter")

MODEL_ID = "gpt-4o"
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


class OpenAIAdapter:
    model_id = MODEL_ID
    model_display_name = DISPLAY_NAME
    slug = "gpt4o"

    def generate(self, date_str: str) -> dict | None:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            log.error("OPENAI_API_KEY not set")
            return None

        client = OpenAI(api_key=api_key)
        now = datetime.utcnow().isoformat() + "Z"
        date_compact = date_str.replace("-", "")
        user_msg = USER_TEMPLATE.format(date=date_str, now=now, date_compact=date_compact)

        for attempt in range(3):
            try:
                log.info(f"GPT-4o attempt {attempt + 1}...")
                response = client.chat.completions.create(
                    model=MODEL_ID,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_msg},
                    ],
                    max_tokens=2048,
                    temperature=0.2,
                )

                # Extract text — may come from tool_calls or direct content
                text = ""
                msg = response.choices[0].message
                if msg.content:
                    text = msg.content
                # If the model used web search and returned content via tool outputs,
                # the final assistant message should still contain the JSON.

                data = extract_json_from_text(text)
                if data:
                    data["model"] = MODEL_ID
                    data["model_display_name"] = DISPLAY_NAME
                    data["date"] = date_str
                    return data
                else:
                    log.warning(f"GPT-4o attempt {attempt + 1}: could not parse JSON")
                    log.debug(f"Raw: {text[:500]}")
            except Exception as e:
                log.error(f"GPT-4o attempt {attempt + 1} failed: {e}")

        log.error("GPT-4o: all 3 attempts failed")
        return None
