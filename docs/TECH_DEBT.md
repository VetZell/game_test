# Technical Debt

## High
- Run the Alembic baseline upgrade and irreversible-downgrade failure path against a staging/production-like PostgreSQL database copy before production rollout; SQLite coverage verifies the existing-schema and data-preservation paths, but PostgreSQL rollout still needs environment-specific validation.
- Current Docker startup commands do not run Alembic migrations automatically and the backend Docker build context does not copy Alembic assets into the runtime image; production migration execution remains a manual/operational step until deployment workflow is explicitly designed.
- `POST /api/v1/players` and `GET /api/v1/players/{telegram_id}` are not Telegram-authenticated in the current code; review whether these helper endpoints should be protected, removed, or limited before production exposure.

## Medium
- Frontend calls to `/api/v1/chat` and `/api/v1/actions` do not send `idempotency_key`; decide and coordinate client rollout if duplicate-submission protection should be used by production clients.
- Gameplay/economy mutation logic currently lives inside FastAPI route handlers in `backend/app/main.py`; consider extracting service-level logic after behavior is covered by broader tests.

## Low
- Expand end-to-end and frontend coverage.
- Review React rendering and bundle performance.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
