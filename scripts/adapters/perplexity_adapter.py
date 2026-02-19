"""Perplexity Sonar Pro adapter (searches by default)."""

import os
import json
from openai import OpenAI  # Perplexity is OpenAI-compatible

from utils import get_logger, extract_json_from_text

log = get_logger("perplexity_adapter")

MODEL_ID = "sonar-pro"
DISPLAY_NAME = "Perplexity"
BASE_URL = "https://api.perplexity.ai"

SYSTEM_PROMPT = """You are a market analyst in a daily AI prediction experiment.
You will research current market conditions and make precise, falsifiable stock predictions.
You have real-time internet access and must use it.
Your predictions will be scored against actual closing prices — calibrate your confidence carefully.
High-confidence wrong predictions are penalized heavily. Be honest about uncertainty.
Respond with ONLY valid JSON — no markdown, no extra text."""

USER_TEMPLATE = """Today is {date}. The US market opens at 9:30 AM ET.

Research current market conditions (futures, pre-market movers, overnight news, economic calendar)
then make 3-5 specific predictions for today.

At least one must be on SPY, QQQ, or DIA.

Return ONLY this JSON structure (no markdown):
{{
  "date": "{date}",
  "model": "sonar-pro",
  "model_display_name": "Perplexity",
  "generated_at": "<ISO8601 now>",
  "market_context": "<2-3 sentence summary of what you found>",
  "predictions": [
    {{
      "id": "pred_perplexity_{date_compact}_001",
      "ticker": "TICKER",
      "prediction_type": "price_direction",
      "direction": "up",
      "target_price": 0.00,
      "current_price_at_prediction": 0.00,
      "timeframe": "end_of_day",
      "confidence": 0.65,
      "reasoning": "2-3 sentences with specific data points"
    }}
  ]
}}"""


class PerplexityAdapter:
    model_id = MODEL_ID
    model_display_name = DISPLAY_NAME
    slug = "perplexity"

    def generate(self, date_str: str) -> dict | None:
        api_key = os.environ.get("PERPLEXITY_API_KEY")
        if not api_key:
            log.error("PERPLEXITY_API_KEY not set")
            return None

        client = OpenAI(api_key=api_key, base_url=BASE_URL)
        date_compact = date_str.replace("-", "")
        user_msg = USER_TEMPLATE.format(date=date_str, date_compact=date_compact)

        for attempt in range(3):
            try:
                log.info(f"Perplexity attempt {attempt + 1}...")
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
                    log.warning(f"Perplexity attempt {attempt + 1}: could not parse JSON")
                    log.debug(f"Raw: {text[:500]}")
            except Exception as e:
                log.error(f"Perplexity attempt {attempt + 1} failed: {e}")

        log.error("Perplexity: all 3 attempts failed")
        return None
