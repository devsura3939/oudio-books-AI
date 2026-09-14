# EngBot hybrid storage rollout

## Supabase changes

Migration 010 adds a private per-account library revision and an authenticated RPC. A transaction that mutates books, chapters or audio segments increments the owner's revision. Existing clients remain compatible. The migration was applied through the project's PostgreSQL pooler; trigger and authenticated RPC checks passed and the test book update was rolled back.

The client subscribes to compact account revisions, checks only that revision during recovery, and falls back to manifests on deployments without the RPC. Visible-tab recovery checks run every 60 seconds; realtime notifications and reconnects remain immediate. Deleted records discovered during reconciliation are forwarded to the existing offline-mirror cleanup. Events arriving during a refresh schedule another refresh.

Saves compare owned fields and write changed chapters only, in bounded batches. No-change saves do not rewrite books or chapters. Checkpoints are serialized and account switches reject pending work. Synthesis state is retained for metadata-only edits; changed narration content becomes pending. Failed writes do not advance the cache.

## Sites preparation

Private Site: `appgprj_6aa723b85ae4819188d23c70d147b995` (`engbot-reader`).
The separate `engbot-sites` checkout retains the complete static studio and existing Supabase authentication. D1 records private file ownership and SHA-256 checksums; R2 stores streamed file bytes. Server routes validate existing Supabase sessions, restrict file access by owner, issue expiring download tickets, and support byte ranges for audio seeking.

This is migration preparation. Production content has not been relocated and Sites storage is not yet selected by production clients. Public traffic must not be switched until account allowance, file-reference integration, source preservation, deletion propagation, authentication redirects and cross-device flows are verified. Do not call a frontend copy a completed backend migration.

## Remaining cutover gates

1. Verify deployed Sites upload, checksum, range read, private authorization and deletion with disposable fixtures.
2. Connect the storage adapter to all source-file, scan, cover, audio and chapter-content references, with renewable authenticated URLs and stable object IDs.
3. Resumably copy existing objects and large chapter payloads; match counts, owner IDs and checksums, retaining originals.
4. Verify two accounts and two devices, registration/recovery redirect configuration, bookmarks, translation checkpoints, scanning, reader playback and training resources.
5. Reconcile intervening writes, switch routing, and retain the rollback copy. No irreversible old-storage cleanup is part of this preparation.
