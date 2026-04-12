# Future Changes

## Proposal: Fixed daily watchlist for all models

### Idea
Define a constant set of 6-10 stocks and ETFs that every model must evaluate each market day. Instead of letting each model choose its own ticker universe, all models would generate predictions on the same fixed watchlist.

### Why consider this
- Consensus is currently harder to reach because models often choose completely different names.
- A shared watchlist would make model comparisons more direct and easier to interpret.
- Head-to-head, consensus, calibration, and simulator results would all have more overlap and more usable data.

### Benefits
- Preserves model independence better than using one model to choose the universe for the others.
- Creates cleaner apples-to-apples benchmarking.
- Makes consensus picks more likely, since overlap is guaranteed.
- Simplifies scoring and analysis because every model is answering the same set of daily questions.

### Risks and tradeoffs
- Reduces discovery. Models can no longer surface unexpected strong opportunities outside the watchlist.
- A static list can become stale if market leadership or macro conditions change.
- Results may become more reflective of watchlist quality than model quality if the basket is poorly chosen.
- Could bias the project toward large-cap, high-liquidity names and miss where some models may have real edge.

### Better version of the idea
Use a stable but reviewable watchlist rather than a permanent untouched list.

Possible structure:
- major index ETFs
- macro-sensitive ETFs
- a few high-liquidity individual names
- periodic review and replacement when names stop being relevant

### Recommendation
This is a stronger idea than forcing all models to follow GPT-4o's picks. It improves comparability without introducing model anchoring bias. If the goal is cleaner benchmarking and more frequent consensus trades, this is a reasonable direction to test.
