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
