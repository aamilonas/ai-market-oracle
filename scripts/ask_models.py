"""
Ask every active model the same one-off question, with web search on.

Separate from the daily pipeline: nothing is written to data/ and nothing is scored.
Each model's full answer, citations and cost are saved to --out, plus a combined
answers.json with the JSON block each model was asked to end with.

Usage:
  python scripts/ask_models.py --prompt-file scripts/prompts/asks/<name>.txt --out ask-output
  python scripts/ask_models.py --prompt-file ... --models kimi-k3-1-pro,qwen-3-8-max --max-tokens 32000
"""

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from adapters.openrouter_adapter import MAX_TOKENS, OpenRouterAdapter, _citations, _field
from openrouter import get_client
from utils import REPO_ROOT, clean_model_text, extract_json_from_text, get_logger, load_models

log = get_logger("ask_models")

SYSTEM = (
    "You are a markets analyst with live web search. Research before answering, "
    "verify every claim you rely on, cite what you used, and say plainly when "
    "something is uncertain or you could not confirm it."
)


def load_env_file():
    """Pick up OPENROUTER_API_KEY from a gitignored repo-root .env when running locally."""
    env = REPO_ROOT / ".env"
    if os.environ.get("OPENROUTER_API_KEY") or not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        key, sep, value = line.strip().partition("=")
        if sep and not key.startswith("#"):
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def ask(cfg: dict, prompt: str, max_tokens: int = MAX_TOKENS) -> dict:
    adapter = OpenRouterAdapter(cfg)
    client = get_client()
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}]
    last_error = None
    for attempt in range(3):
        try:
            started = time.monotonic()
            response = client.chat.completions.create(
                model=adapter.model_id,
                messages=messages,
                max_tokens=max_tokens,
                extra_body=adapter._extra_body(),
            )
            if not response.choices:
                raise RuntimeError(f"empty response: {_field(response, 'error')}")
            message = response.choices[0].message
            text = message.content or ""
            if not text.strip():
                raise RuntimeError(f"blank answer (finish_reason={response.choices[0].finish_reason})")
            usage = response.usage
            return {
                "slug": cfg["slug"],
                "model": cfg["display_name"],
                "ok": True,
                "answer": text,
                "pick": extract_json_from_text(clean_model_text(text)),
                "citations": _citations(response, message),
                "web_search": adapter.web_search,
                "latency_seconds": round(time.monotonic() - started, 1),
                "cost_usd": _field(usage, "cost") if usage else None,
            }
        except Exception as e:
            last_error = str(e)
            log.warning(f"{cfg['slug']} attempt {attempt + 1} failed: {e}")
            time.sleep(2 ** (attempt + 1))
    return {"slug": cfg["slug"], "model": cfg["display_name"], "ok": False, "error": last_error}


def main():
    parser = argparse.ArgumentParser(description="Ask every active model one question")
    parser.add_argument("--prompt-file", required=True)
    parser.add_argument("--out", default="ask-output")
    parser.add_argument("--models", help="Comma-separated slugs (default: all active)")
    parser.add_argument(
        "--max-tokens", type=int, default=MAX_TOKENS,
        help=f"Output cap per model, reasoning included (default {MAX_TOKENS}). Open-ended "
             "research makes reasoning models think longer; OpenRouter reserves the cost of "
             "the full cap up front, so a higher cap needs more credit headroom.",
    )
    args = parser.parse_args()

    load_env_file()
    prompt = Path(args.prompt_file).read_text(encoding="utf-8")
    models = load_models(active_only=True)
    if args.models:
        wanted = set(args.models.split(","))
        models = [m for m in models if m["slug"] in wanted]

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    results = []
    with ThreadPoolExecutor(max_workers=len(models)) as pool:
        futures = [pool.submit(ask, cfg, prompt, args.max_tokens) for cfg in models]
        for future in as_completed(futures):
            r = future.result()
            results.append(r)
            if r["ok"]:
                (out / f"{r['slug']}.md").write_text(
                    f"# {r['model']}\n\n{r['answer']}\n\n## Citations\n\n"
                    + "\n".join(f"- {u}" for u in r["citations"]) + "\n",
                    encoding="utf-8",
                )
                log.info(f"{r['slug']}: ok in {r['latency_seconds']}s, ${r['cost_usd']}")
            else:
                log.error(f"{r['slug']}: failed — {r['error']}")

    results.sort(key=lambda r: r["slug"])
    (out / "answers.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    ok = sum(r["ok"] for r in results)
    cost = sum(r.get("cost_usd") or 0 for r in results)
    log.info(f"{ok}/{len(results)} models answered, total ${cost:.4f} — saved to {out}")
    if ok == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
