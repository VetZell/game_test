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

## TASK-005 — Chat/action service extraction
- Moved chat reply/state/memory logic and action economy/state/event logic from FastAPI handlers into `backend/app/game_services.py` without changing API contracts or game balance.
- Added service-level tests covering chat behavior, all supported actions, state mutations and memory/event creation.
- Kept idempotency behavior covered by existing replay/conflict tests and updated architecture/project documentation.

## TASK-006 — Frontend idempotency keys
- Added a frontend mutation payload helper that creates backend-compatible idempotency keys with `crypto.randomUUID()` and a local fallback.
- Included `idempotency_key` in chat and action request JSON payloads without changing backend API, UI text, balance or schema.
- Removed completed frontend idempotency-key rollout debt from project documentation.

## TASK-007 — Player helper endpoint security
- Removed unauthenticated `POST /api/v1/players` and `GET /api/v1/players/{telegram_id}` routes because frontend and backend flows use Telegram-authenticated auth/chat/action endpoints instead.
- Added HTTP-level tests proving the former helper routes return `404`, cannot create/read other users, and authenticated auth/chat/action flows still work.
- Removed the completed unauthenticated player helper endpoint debt from project documentation.
