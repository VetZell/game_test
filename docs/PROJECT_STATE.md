# Project State

## Repository
- Name: `VetZell/game_test`
- Default branch: `main`
- Product: Telegram Mini App «День Марины»

## Frontend
- React 18 + TypeScript + Vite Telegram Mini App frontend.
- Entry point: `frontend/src/main.tsx`; current app shell and gameplay UI live primarily in `frontend/src/App.tsx`.
- The frontend initializes Telegram WebApp APIs, reads `initData`, authenticates through the backend, renders Marina visuals from `frontend/public/marina/` assets, and calls backend chat/action endpoints.
- API base URL comes from `VITE_API_URL`; when absent, code falls back to the current Railway backend URL.
- Current frontend requests do not send backend `idempotency_key` values.

## Backend
- FastAPI + async SQLAlchemy + PostgreSQL.
- Entry point: `backend/app/main.py`; deployment command runs `uvicorn app.main:app`. Chat/action route handlers now delegate gameplay/economy mutations to `backend/app/game_services.py`.
- Runtime schema creation has been removed from the FastAPI lifespan; schema management is represented by Alembic configuration and a baseline migration that handles empty databases and existing create_all-created schemas.
- The baseline downgrade is intentionally irreversible to prevent accidental deletion of adopted pre-Alembic tables and user data.
- Production CORS origins are read from `CORS_ORIGINS`; localhost origins are denied by default and added only when `ENVIRONMENT`/`APP_ENV` explicitly selects a local/development/test environment.
- Economy-changing chat and action requests support optional idempotency keys backed by persisted idempotency records with request fingerprints; reusing a key with a different payload returns HTTP 409.
- Telegram authentication is enforced for `/api/v1/auth/telegram`, `/api/v1/chat`, and `/api/v1/actions` through `TELEGRAM_BOT_TOKEN` validation.
- `POST /api/v1/players` and `GET /api/v1/players/{telegram_id}` exist in code and are not Telegram-authenticated in the current implementation.

## Database and Migrations
- `DATABASE_URL` configures the async database engine; `postgres://` and `postgresql://` URLs are converted to `postgresql+asyncpg://`.
- Alembic revision `20260722_0001` covers `users`, `marina_states`, `marina_memories`, and `idempotency_records`.
- Migration application is an operational step; current Docker startup commands do not run Alembic automatically.

## Deployment
- Root and backend Dockerfiles run the FastAPI backend with Uvicorn.
- Frontend Dockerfile builds static Vite output and serves it with `serve`.
- Railway JSON files define Dockerfile builders and healthcheck paths for root/backend/frontend deployment layouts.

## Current Workflow
- ChatGPT writes the active task into `docs/TASK.md`.
- Codex executes it according to `docs/CODEX_PROTOCOL.md` when the status is `READY`.
- Codex writes results into `docs/REPORT.md`.
- The short command `выполни` executes the active ready task without merge; `слей` is the only merge authorization command.

## Current Focus
- Keep architecture documentation synchronized with the verified repository state.
- Preserve runtime behavior while documenting confirmed limitations and future work.

## Known Issues
- Full production migration execution still requires a real `DATABASE_URL` and PostgreSQL staging/production-like validation.
- Frontend idempotency-key rollout is not implemented yet.
- Player helper endpoints remain in `backend/app/main.py`; chat/action gameplay rules now live in `backend/app/game_services.py`.
