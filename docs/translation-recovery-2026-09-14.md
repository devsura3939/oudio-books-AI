# Translation recovery verification — 2026-09-14

## Reproduced failure

The failing 850-character segment contained 16 source paragraphs. Google Translate returned HTTP 429; MyMemory returned English for a citation fragment and correctly failed the language check. No local model was connected. The configured custom gateway used its default reasoning allowance: a live request spent 2,996 completion tokens in 23.0 seconds, ended with `finish_reason: length`, and exposed only 235 characters of partial JSON. The old shared 20-second recovery deadline also prevented later providers from getting a complete attempt.

## Changes

- Bound Merge Gateway thinking to 1,024 tokens and reserve space for the final answer. Reject truncated custom responses, and exclude thought parts from Gemini response extraction.
- Give the selected custom model first opportunity and isolate each provider's deadline. Retain parent cancellation. Essential recovery has a separate 75-second deadline; optional edits keep their existing 20-second limit.
- Use numbered paragraph outputs, requiring every ID exactly once in order. Preserve the existing script, completeness, paragraph and numeric validation. Keep legacy response compatibility and checkpoint fingerprints, so accepted segments remain reusable.
- Apply optional-editing spending limits to optional edits, not essential recovery when no validated baseline exists. Recovery can use the user's configured paid provider until the requested book completes, the user stops, or the provider fails. Token accounting continues; this is not free or offline translation.
- Report actual machine and AI failures. Do not call nonexistent server AI routes on the current Sites deployment.

## Verification

The same segment with the production prompt and bounded reasoning completed in 5.49 seconds, `finish_reason: stop`, 543 completion tokens, 1,239 total tokens, reported cost $0.00255825. All 16 numbered paragraphs were present. The actual phase pipeline accepted it with machine translation unavailable. The recovered text passed deterministic language, completeness, and number checks; this is not a claim of perfect literary translation or completed whole-book verification.

186 JavaScript tests and 21 Python tests passed. Tests cover provider timeouts/cancellation, truncated output, reasoning budgets, numbered paragraph corruption, recovery after optional budget exhaustion, and differentiated failure diagnostics. Studio mirrors match.

Provider control reference: https://docs.merge.dev/merge-gateway/capabilities/reasoning
