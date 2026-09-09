# Language engine 1.50.1

## Narration and source fidelity

Georgian and English speech retain the author's punctuation. Interrogative words
alone do not turn a statement into a question. Native Georgian voices receive
Georgian number/name verbalization without fabricated quotation commas or
compound-word splitting. Additional sentence gaps account for closing quotes and
playback speed. Failed playback retains the sentence; the short-request fallback
speaks every chunk instead of dropping everything after character 200.

The cloud Georgian baseline retains its version history and fixes three harmful
learned transformations: deleting repeated whitespace, changing compound hyphens,
and replacing `by` outside a specific book attribution. OCR stores raw recognition
and offers active-pack corrections for comparison with the image before applying.

## Training Lab

The static studio can train through the signed-in admin's Supabase session.
Migrations 007 and 008 provide transactional promotion, repair the legacy pack,
and add source-integrity holdouts. Engine updates propagate through Supabase
Realtime and refresh on focus and authentication changes.

1. Select Georgian or English and a configured provider. Custom OpenAI-compatible,
   Ollama, and Gemini endpoints are supported; keys stay in the existing account
   settings flow. External automation keys still belong to the server-hosted API.
2. Choose 1–5 iterations, optionally enabling language-specific Wikipedia research.
   Two short, attributed extracts per iteration provide context, not ground truth.
3. The model sees original failures, expected corrections, existing rules, known-good
   examples and previous rejection feedback. Proposals contain up to six literal
   glossary/OCR rules. Compatible legacy formatting rules remain supported.
4. Every changed benchmark output must become exactly correct; known-good text must
   stay unchanged. A mixed proposal can retain independently improving rules.
   The database repeats this evaluation under an active-version lock. A stale
   version or non-admin caller cannot publish. Existing rules are never evicted
   simply to make room for a proposal.
5. Confirmed versions and consulted source references are recorded in cloud training
   history. Run progress, cancellation, provider errors and completion remain visible.

Each request allows at most 2,500 output tokens and 45 seconds. Two consecutive
non-improvements stop a run. Gemini 2.5 Flash uses no thinking budget for these
small proposals; GLM 5.3 uses low reasoning effort. Custom gateways need not support
JSON mode: completed responses are parsed and validated locally. Truncated outputs
are rejected. Stopping cannot undo a database commit that already completed.

Training changes data-only post-editing rules, **not neural model weights**. A
perfect score describes the current examples, not complete fluency, translation
quality or OCR accuracy. New languages require a registered language profile,
verified benchmarks, compatible recognition/translation/voice models and database
validation. Source research never automatically invents approved expected answers.
Runs require an open tab; unattended background scheduling and foundation-model
fine-tuning are not implemented by this release.

## Verification

- Node regression tests cover punctuation, full fallback playback, provider JSON
  compatibility, literal substitutions, cancellation, per-rule filtering and gates.
- Python tests cover punctuation preservation, native language metadata, and empty
  audio failing without replacing an existing recording.
- `scripts/verify-cloud-training.py` uses PG environment variables. Default is a
  transaction rollback; `--apply` commits migrations but always rolls back synthetic
  proposals. It checks accepted improvements, known-good corruption, missing identity,
  stale versions and Georgian boundary/replacement parity.
- Desktop/mobile browser inspection, real Georgian source retrieval and a native
  Georgian audio sample supplement the automated tests. Listening quality still
  needs evaluation by native speakers across real books and recording conditions.

## Sources consulted

- [Georgian stress overview](https://georgian.se/kartuli/GeoGrammar/PHON/10StressMG.html)
- [Georgian prosody research](https://lnborise.github.io/assets/Borise_PDA_GeorgianStress.pdf)
- [Tesseract image quality guidance](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)
- [Gemini thinking budgets](https://ai.google.dev/gemini-api/docs/thinking)
- [GLM 5.3 reasoning controls](https://docs.z.ai/guides/llm/glm-5.3)
