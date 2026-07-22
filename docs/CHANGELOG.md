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
