# Changelog

## 2026-07-22
- Added the file-based ChatGPT ↔ Codex task workflow.
- Added repository-level `AGENTS.md` instructions.
- Added task, report, protocol, project state, roadmap, technical debt and AI context documents.

## 2026-07-22 / TASK-001
- Added Alembic configuration and a baseline backend schema migration.
- Removed runtime `create_all()` schema creation from FastAPI startup.
- Hardened CORS origin handling to use explicit production origins while preserving local development defaults.
- Added persisted idempotency support for chat and action requests that mutate player/economy state.
- Added backend tests for CORS settings, migration coverage and idempotency behavior.

## TASK-002 — PR #2 review fixes
- Made CORS fail closed by default: localhost origins require an explicit local/development/test environment.
- Added request fingerprints to idempotency records and reject same-key/different-payload replays with HTTP 409.
- Made the baseline Alembic migration safe for empty databases and existing schemas created by prior runtime `create_all()`.
- Added tests for CORS defaults, idempotency payload conflicts, and existing-schema Alembic upgrade behavior.
- Documented Alembic bootstrap and verification steps for existing deployments.

## TASK-003 — Alembic baseline downgrade safety
- Made baseline migration `20260722_0001` irreversible to prevent destructive downgrade of adopted pre-Alembic tables.
- Added an automated test proving `alembic downgrade base` fails without deleting legacy `users`, `marina_states`, `marina_memories`, or user data.
- Documented the baseline downgrade policy and rollback guidance.

## TASK-004 — Architecture documentation audit
- Added `docs/ARCHITECTURE.md` describing verified frontend, backend, Telegram, idempotency, migration and deployment structure.
- Updated README, project state, roadmap and technical debt to match audited repository behavior without runtime changes.
- Recorded confirmed future work for migration rollout, frontend idempotency adoption, unauthenticated helper endpoints and route-handler business logic.
