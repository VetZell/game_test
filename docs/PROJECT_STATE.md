# Project State

## Repository
- Name: `VetZell/game_test`
- Default branch: `main`
- Product: Telegram Mini App «День Марины»

## Frontend
- React + TypeScript.
- Centralized Marina visual configuration and character component were previously reported as implemented.

## Backend
- FastAPI + PostgreSQL.
- Runtime schema creation has been removed from the FastAPI lifespan; schema management is now represented by Alembic configuration and a baseline migration that handles empty databases and existing create_all-created schemas.
- Production CORS origins are read from `CORS_ORIGINS`; localhost origins are denied by default and added only when `ENVIRONMENT`/`APP_ENV` explicitly selects a local/development/test environment.
- Economy-changing chat and action requests support optional idempotency keys backed by persisted idempotency records with request fingerprints; reusing a key with a different payload returns HTTP 409.
- Telegram authentication remains in place for authenticated chat/action flows.

## Current Workflow
- ChatGPT writes the active task into `docs/TASK.md`.
- Codex executes it according to `docs/CODEX_PROTOCOL.md`.
- Codex writes results into `docs/REPORT.md`.

## Current Focus
- Backend production readiness: migrations, CORS hardening and idempotency for economy-changing requests.

## Known Issues
- Full production migration execution still requires a real `DATABASE_URL` in the deployment environment.
