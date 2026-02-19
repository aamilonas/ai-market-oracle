"""Model adapter package."""

from adapters.claude_adapter import ClaudeAdapter
from adapters.perplexity_adapter import PerplexityAdapter
from adapters.gemini_adapter import GeminiAdapter
from adapters.openai_adapter import OpenAIAdapter
from adapters.grok_adapter import GrokAdapter

ALL_ADAPTERS = [
    ClaudeAdapter(),
    PerplexityAdapter(),
    GeminiAdapter(),
    OpenAIAdapter(),
    GrokAdapter(),
]

__all__ = [
    "ClaudeAdapter",
    "PerplexityAdapter",
    "GeminiAdapter",
    "OpenAIAdapter",
    "GrokAdapter",
    "ALL_ADAPTERS",
]
