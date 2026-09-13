# EngBot hosting and bandwidth assessment

Updated 2026-09-14. Production remains on GitHub Pages and Supabase. No production data has been moved or deleted, and no replacement Sites project has been created.

## Measured traffic problem and immediate repair

The existing browser recovery timer invalidates the library every 15 seconds. `LuminaStore.getAllBooks()` previously selected every column of every book and chapter, including original text, translations and histories, on each refresh. Realtime events also initiate these reads.

The read-only inventory returned 9 books owned by 2 accounts and 514 chapters. Their uncompressed REST JSON bodies were 652,419 and 12,782,606 bytes respectively. These are content measurements, not Supabase billing totals; the reported 16 GB notice has not been independently inspected.

The new store polls only `id,updated_at`, downloads changed rows in bounded batches, paginates beyond the default API row cap, and reconciles deletions. Cached rows are account-scoped and cloned before callers can edit them. Failed reads do not advance the cache. Hidden tabs skip periodic recovery polling and refresh upon becoming visible; realtime remains enabled.

A real read-only account test returned identical data (7 books, 495 chapters):

| Read | Response bytes | Full-content requests |
| --- | ---: | ---: |
| Initial load including revision lists | 12,976,453 | 6 |
| Subsequent unchanged load | 48,689 | 0 |

That is approximately 99.6% less response data for an unchanged refresh. It is not a promise of 99.6% lower total billing: initial loads, writes, realtime payloads, file downloads and audio streaming still consume traffic. Existing saves upsert whole chapter sets and can generate substantial realtime traffic; a future migration should use changed-row writes and compact change notifications too.

## Sites capabilities and constraints

The installed Sites integration supports Worker-compatible server code, D1 relational storage and R2 files. The current [official Sites guide](https://learn.chatgpt.com/docs/sites) documents a 10 GB D1 database limit, no fixed R2 object-storage limit, HTTP/HTTPS/WebSockets support, and no raw TCP connections. The [OpenAI beta limits](https://help.openai.com/en/articles/20001339) are shared across Sites on the account and can restrict adding storage or keeping a high-usage site public. No account-specific bandwidth allowance is exposed by the available Sites connector; the authenticated account's current Sites usage allowance remains to be checked.

No fixed R2 storage limit is not a guarantee of unlimited Site bandwidth or requests. Cloudflare's direct [R2 pricing](https://developers.cloudflare.com/r2/pricing/) has no egress charge, but this must not be substituted for OpenAI's Sites plan allowance.

| App capability | Migration work required |
| --- | --- |
| Current reader, scanner UI, model settings and library | Preserve the existing static application, assets and all interaction paths; serve through Sites |
| Books, chapters, translations, history, bookmarks, jobs, profiles, settings and training records | Export and reconcile all tables; port PostgreSQL enums, JSON, constraints, policies, RPCs and triggers to D1 plus authenticated server handlers |
| PDFs, scan images, audio and covers | Copy private bytes to R2, verify checksums and ownership, support streaming/range requests and authenticated URLs; remap stored references |
| Existing account ownership | Retain stable app user IDs; no email-based automatic merging of users |
| Email/password, confirmation and recovery | Preserve existing authentication initially, or arrange a verified migration of identities and a working transactional-email sender before retiring Supabase Auth; ChatGPT sign-in is a different user flow |
| Cross-device changes | Replace Supabase subscriptions with compact server revision events or revision polling, including deletions and reconnect recovery |
| Training Lab | Port its authorization, evaluated packs, benchmark results and promotion RPCs; do not silently replace it with local browser state |
| Python OCR, TTS processing and neural translation | Keep a dedicated inference/processing service or device bridge; port lightweight orchestration only to Sites |
| LM Studio | Keep the existing device connection; a phone cannot access another computer through localhost |

Sites' documented Worker deployment shape is not a general Python/GPU server. Cloudflare's [standard Worker limits](https://developers.cloudflare.com/workers/platform/limits/) include 128 MB memory; this is not evidence of an OpenAI inference allocation. The tested local 27B model used about 18.5 GiB. We have not verified a Sites facility that can host that model or the existing Python processing stack. Moving the website does not provide free model inference or replace paid-provider credits.

## Cutover sequence once capacity and identity requirements are settled

1. Register a separate private EngBot Site; preserve the current public application throughout verification.
2. Introduce a storage/backend adapter with the current studio contract. Port all application records and operations, not just the shelf page. Retain email/password behavior until its replacement is verified.
3. Export metadata and storage manifests, then resumably copy private objects. Record row counts, ownership IDs and checksums. Keep credentials and user data out of the source repository.
4. Validate two-account isolation, existing bookmarks and progress, file upload/delete/download, completed translated editions, scanner pages, training promotion, recovery email, and seekable audio playback across devices.
5. Reconcile writes made during migration with a short final write freeze or a verified change journal. Do not enable independent writes to both backends without reconciliation.
6. Switch only after counts and checksums match and the intended public audience can sign in. Keep an intact rollback copy and route; remove old storage only after a successful retention period and explicit deletion authorization.

A front-end-only Sites deployment would retain the same Supabase bandwidth use and would not fulfill the requested backend/database migration. A full cutover is therefore not represented as complete by this bandwidth repair.
