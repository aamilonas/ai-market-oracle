"""Model adapters — one OpenRouter adapter per active model in models.json."""

from adapters.openrouter_adapter import OpenRouterAdapter
from utils import load_models

ALL_ADAPTERS = [OpenRouterAdapter(cfg) for cfg in load_models(active_only=True)]
