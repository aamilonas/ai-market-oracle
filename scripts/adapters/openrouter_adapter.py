from __future__ import annotations

"""Single adapter for every model, routed through OpenRouter.

Each model in models.json gets one instance. All models receive the same
prompt; web search is enabled through OpenRouter's `web` plugin, using the
provider's native search where one exists and Exa otherwise.
"""

import time
from datetime import datetime, timezone

from openrouter import get_client
from utils import PROMPTS_DIR, clean_model_text, extract_json_from_text, get_logger

log = get_logger("openrouter_adapter")

# Generous so reasoning models don't truncate their JSON after thinking.
MAX_TOKENS = 12000
MAX_CITATIONS_SAVED = 15

# Exa's flat per-request price covers 10 results; taking fewer just wastes them.
EXA_MAX_RESULTS = 10

# Content farms that surfaced in place of real market coverage.
SEARCH_EXCLUDE_DOMAINS = ["marketsignal-daily.com", "squawkflow.com"]

# Cheap, fixed model used only to reformat a malformed answer into JSON.
# It never changes the content of a prediction.
REPAIR_MODEL = "google/gemini-3.5-flash-lite"

JSON_REPAIR_PROMPT = """Convert the following market prediction draft into valid JSON.

Return ONLY a single JSON object with this structure:
{"market_context": "...", "predictions": [{"ticker": "SPY", "direction": "up", "target_price": 600.0,
"current_price_at_prediction": 598.0, "timeframe": "end_of_day", "confidence": 0.65, "reasoning": "..."}]}

Rules:
- Preserve the original tickers, directions, prices, confidences and reasoning exactly.
- Do not invent predictions that are not in the draft.
- Output JSON only.

Draft:
"""


def _read_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


def build_messages(date_str: str, now_et: str, market_context: str) -> list[dict]:
    user = (
        _read_prompt("prediction_user.txt")
        .replace("{{NOW_ET}}", now_et)
        .replace("{{DATE}}", date_str)
        .replace("{{MARKET_CONTEXT}}", market_context or "(Market data unavailable today.)")
    )
    return [
        {"role": "system", "content": _read_prompt("prediction_system.txt")},
        {"role": "user", "content": user},
    ]


def _field(obj, name):
    """Read a field from an SDK object or a plain dict."""
    if isinstance(obj, dict):
        return obj.get(name)
    value = getattr(obj, name, None)
    if value is None and getattr(obj, "model_extra", None):
        value = obj.model_extra.get(name)
    return value


def _citations(response, message) -> list[str]:
    urls = []
    for ann in _field(message, "annotations") or []:
        cite = _field(ann, "url_citation")
        url = _field(cite, "url") if cite else None
        if url:
            urls.append(url)
    # Perplexity also returns a top-level citations list
    for url in _field(response, "citations") or []:
        if isinstance(url, str):
            urls.append(url)
    return list(dict.fromkeys(urls))[:MAX_CITATIONS_SAVED]


class OpenRouterAdapter:
    def __init__(self, cfg: dict):
        self.slug = cfg["slug"]
        self.model_id = cfg["openrouter_model"]
        self.model_display_name = cfg["display_name"]
        self.web_search = cfg.get("web_search", "native")
        self.last_error = None

    def _extra_body(self) -> dict:
        extra = {"usage": {"include": True}}
        if self.web_search == "native":
            extra["plugins"] = [{"id": "web", "engine": "native"}]
        elif self.web_search == "exa":
            # Exa bills $0.007 per request including up to 10 results, so 10 costs
            # the same as the default 5.
            extra["plugins"] = [{
                "id": "web",
                "engine": "exa",
                "max_results": EXA_MAX_RESULTS,
                "exclude_domains": SEARCH_EXCLUDE_DOMAINS,
            }]
        # "built_in": the model always searches (Perplexity Sonar) — no plugin needed
        return extra

    def _repair(self, client, raw_text: str) -> dict | None:
        try:
            response = client.chat.completions.create(
                model=REPAIR_MODEL,
                messages=[{"role": "user", "content": JSON_REPAIR_PROMPT + raw_text[:12000]}],
                response_format={"type": "json_object"},
                temperature=0,
                max_tokens=4000,
            )
            return extract_json_from_text(response.choices[0].message.content or "")
        except Exception as e:
            log.warning(f"{self.slug}: repair pass failed: {e}")
            return None

    def generate(self, date_str: str, market_context: str = "", now_et: str = "") -> dict | None:
        self.last_error = None
        try:
            client = get_client()
        except RuntimeError as e:
            self.last_error = str(e)
            log.error(self.last_error)
            return None

        messages = build_messages(date_str, now_et, market_context)

        for attempt in range(3):
            try:
                log.info(f"{self.slug} attempt {attempt + 1}...")
                started = time.monotonic()
                response = client.chat.completions.create(
                    model=self.model_id,
                    messages=messages,
                    max_tokens=MAX_TOKENS,
                    extra_body=self._extra_body(),
                )
                elapsed = round(time.monotonic() - started, 1)
                if not response.choices:
                    raise RuntimeError(f"empty response: {_field(response, 'error')}")
                message = response.choices[0].message
                text = message.content or ""

                repaired = False
                data = extract_json_from_text(clean_model_text(text))
                if not data and text.strip():
                    log.warning(f"{self.slug}: could not parse JSON, trying repair pass")
                    data = self._repair(client, clean_model_text(text))
                    repaired = data is not None

                if data and isinstance(data.get("predictions"), list):
                    usage = response.usage
                    data["run"] = {
                        "provider": _field(response, "provider"),
                        "web_search": self.web_search,
                        "citations": _citations(response, message),
                        "json_repaired": repaired,
                        "latency_seconds": elapsed,
                        "prompt_tokens": _field(usage, "prompt_tokens") if usage else None,
                        "completion_tokens": _field(usage, "completion_tokens") if usage else None,
                        "cost_usd": _field(usage, "cost") if usage else None,
                        "finished_at": datetime.now(timezone.utc).isoformat(),
                    }
                    return data

                finish = response.choices[0].finish_reason
                self.last_error = f"Response was not valid prediction JSON (finish_reason={finish})"
                log.warning(f"{self.slug} attempt {attempt + 1}: {self.last_error}")
                log.info(f"Raw (first 500 chars): {text[:500]}")
            except Exception as e:
                self.last_error = str(e)
                log.error(f"{self.slug} attempt {attempt + 1} failed: {e}")

            if attempt < 2:
                time.sleep(2 ** (attempt + 1))

        log.error(f"{self.slug}: all 3 attempts failed")
        return None
