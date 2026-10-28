"""OpenRouter client shared by the prediction adapter and the summarizer."""

import os

from openai import OpenAI

BASE_URL = "https://openrouter.ai/api/v1"


def get_client() -> OpenAI:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")
    return OpenAI(
        api_key=api_key,
        base_url=BASE_URL,
        default_headers={"X-Title": "AI Market Oracle"},
        timeout=300,
    )
