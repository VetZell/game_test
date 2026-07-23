# Project State

## Repository
- Name: `VetZell/game_test`
- Default branch: `main`
- Product: Telegram Mini App «День Марины»

## Frontend
- React 18 + TypeScript + Vite Telegram Mini App frontend.
- Entry point: `frontend/src/main.tsx`; current app shell and gameplay UI live primarily in `frontend/src/App.tsx`.
- The frontend initializes Telegram WebApp APIs, reads `initData`, authenticates through the backend, renders Marina visuals from `frontend/public/marina/` assets through a centralized emotion display mapping, and calls backend chat/action/day-advance endpoints.
- API base URL comes from `VITE_API_URL`; when absent, code falls back to the current Railway backend URL.
- Chat/action/day-advance frontend requests include backend-compatible `idempotency_key` values generated per intentional user mutation; helper behavior is covered by Vitest unit tests and critical Telegram auth/chat/action/day-advance/emotion React flows are covered by Vitest/jsdom integration tests with mocked Telegram WebApp and fetch.

## Backend
- FastAPI + async SQLAlchemy + PostgreSQL.
- Entry point: `backend/app/main.py`; deployment command runs `uvicorn app.main:app`. Chat/action/day-advance route handlers now delegate gameplay/economy/period mutations to `backend/app/game_services.py`, and chat replies delegate deterministic intent/emotional-tone/memory policy to `backend/app/personality.py`.
- Runtime schema creation has been removed from the FastAPI lifespan; schema management is represented by Alembic configuration and a baseline migration that handles empty databases and existing create_all-created schemas.
- The baseline downgrade is intentionally irreversible to prevent accidental deletion of adopted pre-Alembic tables and user data.
- Production CORS origins are read from `CORS_ORIGINS`; localhost origins are denied by default and added only when `ENVIRONMENT`/`APP_ENV` explicitly selects a local/development/test environment.
- Economy-changing chat/action requests and day-period advancement support optional idempotency keys backed by persisted idempotency records with request fingerprints; reusing a key with a different payload returns HTTP 409.
- Telegram authentication is enforced for `/api/v1/auth/telegram`, `/api/v1/chat`, `/api/v1/actions`, and `/api/v1/day/advance` through `TELEGRAM_BOT_TOKEN` validation.
- Marina day progression uses existing `day`/`period` fields with deterministic `morning → day → evening → night → morning` transitions, small clamped need deltas, event-memory persistence, and no database schema changes.
- Former unauthenticated player helper endpoints `POST /api/v1/players` and `GET /api/v1/players/{telegram_id}` have been removed; player records are created or loaded through Telegram-authenticated auth/chat/action flows.

## Database and Migrations
- `DATABASE_URL` configures the async database engine; `postgres://` and `postgresql://` URLs are converted to `postgresql+asyncpg://`.
- Alembic revision `20260722_0001` covers `users`, `marina_states`, `marina_memories`, and `idempotency_records`.
- Migration application is an explicit operational step via `backend/scripts/migrate.sh`; Docker startup commands do not run Alembic automatically.

## Deployment
- Root and backend Dockerfiles include Alembic assets plus `scripts/` in the backend runtime image and run the FastAPI backend with Uvicorn only.
- Frontend Dockerfile builds static Vite output and serves it with `serve`.
- Railway JSON files define Dockerfile builders and healthcheck paths for root/backend/frontend deployment layouts; migrations are run separately before API deploy/start and `/health` verification.

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
- Chat/action gameplay orchestration lives in `backend/app/game_services.py`; deterministic Marina chat personality/memory policy lives in `backend/app/personality.py`; public player helper endpoints are no longer exposed.

## TASK-013 Frontend UI State
- The main Telegram Mini App screen now has a polished HUD, period-aware scene styling, synchronized emotion label/visual/tone mapping, clearer action cards, explicit day-advance target text, non-interactive placeholders for unavailable navigation sections, safe-area CSS, focus-visible styling, reduced-motion support and updated integration coverage.
- No backend API, database schema, Alembic revision, auth, idempotency semantics, personality policy or action economy changed in TASK-013.
