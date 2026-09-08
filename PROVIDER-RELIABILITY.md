# Provider reliability — v1.49.1

Translation could stall because a 42,595-character Georgian guide was repeated for each segment, provider catalogs contained unavailable models, and minor reviewer suggestions rejected otherwise usable output. Actual requests also encountered Gemini quota limits, Groq token limits, and custom/OpenRouter timeouts.

## Changes

- Bound per-segment Georgian rule retrieval to 6,000 characters; preserve the full knowledge base for training and offline use. Keep complete rule paragraphs and prioritize case, morphology, source negation and names.
- Add Gemini 3.1 Flash Lite fallback. Update Groq and OpenRouter entries against the live model catalogs. Preserve user model preferences and recover labeled API-key pastes.
- Validate draft/review/revision schemas before accepting a provider response; continue to the next configured provider after malformed or wrong-language output. Minor review suggestions do not block acceptance. Accuracy/grammar defects receive at most two correction-and-review rounds and still fail closed if unresolved.
- Report actual stages, provider failures, accepted segments and character counts. Retry retains accepted checkpoints and targets the original book/account. Derive translation direction from source text instead of an existing translation's language metadata.
- Give provider requests deadlines through receipt of the full response, including audio. Neural OCR recovers after a temporary outage, skips the nonexistent Pages API route, and joins all visible Gemini response parts.
- Buffer upcoming ElevenLabs sentences, coalesce synthesis requests, bound retained audio, abort pending synthesis on stop/seek, and revoke audio URLs. English narration receives surrounding text; Georgian uses v3 with its language code. Remove forced whisper/excitement tags from ordinary prose.
- Fix chapter-grid overflow at 320px. Retain the v1.49.0 desktop/mobile design and existing features.

## Validation

44 Node regression tests, 58 Python tests, legacy auth/PDF/reader suites, Georgian integrity checks, studio mirror checks, production build and TypeScript checks passed locally. Live requests translated and reviewed the reported book's first segment. Gemini 3.1 Flash Lite completed English-to-Georgian and Georgian-to-English pipelines after quota fallback. A controlled bilingual scan retained both languages and numbers. ElevenLabs returned audio/mpeg for English (42,675 bytes) and Georgian (35,570 bytes). Browser screenshots verified the signed-in library at 320px and 1440px without horizontal overflow. Browser interaction verification used CUA; the separate CLI's clicks did not reliably dispatch application actions.

These checks do not establish native-speaker accuracy across every book or unlimited provider availability. Forced Groq-only stress tests reached the account's 8,000 TPM limit. Failed reviews and exhausted providers preserve source and checkpoints rather than publishing incomplete work. The Python/Lovable server deployment dependency documented in ENGINE-RELIABILITY.md is unchanged; this release runs through the static studio's configured direct providers.

References: https://console.groq.com/docs/models ; https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite ; https://elevenlabs.io/docs/api-reference/text-to-speech/convert . Account model availability was checked directly through each provider's models API on 2026-09-08.
