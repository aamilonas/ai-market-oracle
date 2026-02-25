"""Anthropic Claude adapter with web_search tool."""

import os
import json
import time
from datetime import date

import anthropic

from utils import get_logger, extract_json_from_text

log = get_logger("claude_adapter")

MODEL_ID = "claude-sonnet-4-20250514"
DISPLAY_NAME = "Claude"


def _build_prompt(date_str: str, schema: str) -> str:
    return f"""You are a market analyst participating in a daily AI prediction experiment.
Your task: Research current market conditions using your internet access,
then make 3-5 specific, falsifiable stock market predictions for today.

RULES:
1. You MUST research current pre-market data, overnight futures, recent news,
   and any relevant economic events before making predictions.
2. Each prediction must include: ticker symbol, direction (up/down),
   a specific target price, a timeframe, a confidence level (0.50-0.95),
   and 2-3 sentences of reasoning.
3. At least ONE prediction must be on a major index: SPY, QQQ, or DIA.
4. Be honest about your confidence. 0.50 means you're guessing.
   0.90+ means you see very strong signals.
5. You are scored on accuracy. High-confidence wrong calls are penalized heavily.
   Low-confidence correct calls earn little. Be calibrated.
6. Your reasoning should reference specific data points, news, or technicals
   you found during your research.

Today's date: {date_str}
Market opens at 9:30 AM ET.

After researching, respond with ONLY valid JSON in this exact format:
{schema}"""


PREDICTION_SCHEMA = """{
  "date": "YYYY-MM-DD",
  "model": "model-id",
  "model_display_name": "Display Name",
  "generated_at": "ISO8601 timestamp",
  "market_context": "Brief 2-3 sentence summary of market conditions",
  "predictions": [
    {
      "id": "pred_modelname_YYYYMMDD_001",
      "ticker": "TICKER",
      "prediction_type": "price_direction",
      "direction": "up or down",
      "target_price": 123.45,
      "current_price_at_prediction": 120.00,
      "timeframe": "end_of_day",
      "confidence": 0.70,
      "reasoning": "2-3 sentence explanation"
    }
  ]
}"""


class ClaudeAdapter:
    model_id = MODEL_ID
    model_display_name = DISPLAY_NAME
    slug = "claude"

    def generate(self, date_str: str) -> dict | None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            log.error("ANTHROPIC_API_KEY not set")
            return None

        client = anthropic.Anthropic(api_key=api_key)
        prompt = _build_prompt(date_str, PREDICTION_SCHEMA)

        for attempt in range(3):
            try:
                log.info(f"Claude attempt {attempt + 1}...")
                response = client.messages.create(
                    model=MODEL_ID,
                    max_tokens=4096,
                    tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 5}],
                    messages=[{"role": "user", "content": prompt}],
                )

                # Extract text from response content
                text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        text += block.text

                data = extract_json_from_text(text)
                if data:
                    # Enforce correct metadata
                    data["model"] = MODEL_ID
                    data["model_display_name"] = DISPLAY_NAME
                    data["date"] = date_str
                    return data
                else:
                    log.warning(f"Claude attempt {attempt + 1}: could not parse JSON from response")
                    log.debug(f"Raw response: {text[:500]}")

            except Exception as e:
                log.error(f"Claude attempt {attempt + 1} failed: {e}")

            if attempt < 2:
                time.sleep(2 ** attempt)

        log.error("Claude: all 3 attempts failed")
        return None
