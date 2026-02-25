"""Model adapter package — resilient loading so one broken adapter doesn't block others."""

import logging

log = logging.getLogger("adapters")

ALL_ADAPTERS = []

def _try_import(name, module_path, class_name):
    try:
        import importlib
        mod = importlib.import_module(module_path)
        cls = getattr(mod, class_name)
        ALL_ADAPTERS.append(cls())
    except Exception as e:
        log.warning(f"Could not load {name} adapter: {e}")

_try_import("Claude", "adapters.claude_adapter", "ClaudeAdapter")
_try_import("Perplexity", "adapters.perplexity_adapter", "PerplexityAdapter")
_try_import("Gemini", "adapters.gemini_adapter", "GeminiAdapter")
_try_import("OpenAI", "adapters.openai_adapter", "OpenAIAdapter")
_try_import("Grok", "adapters.grok_adapter", "GrokAdapter")
