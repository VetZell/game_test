# Architecture

## Purpose
«День Марины» is a Telegram Mini App game: a cozy relationship simulator where the player interacts with Marina, changes Marina/player state, and receives persisted conversation memory.

## Repository layout
- `frontend/` — React + TypeScript + Vite Telegram Mini App frontend.
  - `frontend/src/main.tsx` mounts React and imports global styles.
  - `frontend/src/App.tsx` contains the current single-page game shell, Telegram WebApp initialization, API calls, local UI state, Marina visuals, action buttons, and chat overlay.
  - `frontend/src/mutationPayload.ts` builds chat/action mutation payloads with per-request `idempotency_key` values.
  - `frontend/src/mutationPayload.test.ts` covers idempotency key generation and mutation payload behavior with Vitest in Node mode.
  - `frontend/src/telegram.d.ts` declares the Telegram WebApp browser API used by the app.
  - `frontend/public/marina/` and `frontend/public/marina/v2/` contain Marina image assets and manifests.
  - `frontend/Dockerfile`, `frontend/railway.json`, and `frontend/serve.json` describe the static frontend deployment.
- `backend/` — FastAPI backend with PostgreSQL persistence.
  - `backend/app/main.py` defines the FastAPI app, CORS middleware, health/root endpoints, Telegram auth endpoint, and thin chat/action route handlers.
  - `backend/app/game_services.py` contains chat/action gameplay rules, economy/stat mutations, and memory/event creation.
  - `backend/app/database.py` builds the async SQLAlchemy engine from `DATABASE_URL` and converts Railway-style `postgres://`/`postgresql://` URLs to `postgresql+asyncpg://`.
  - `backend/app/models.py` defines SQLAlchemy models for `users`, `marina_states`, `marina_memories`, and `idempotency_records`.
  - `backend/app/schemas.py` defines Pydantic request/response schemas.
  - `backend/app/telegram_auth.py` validates Telegram Mini App `initData` using `TELEGRAM_BOT_TOKEN`.
  - `backend/app/idempotency.py` stores/replays idempotent responses and rejects same-key/different-payload conflicts.
  - `backend/alembic.ini` and `backend/alembic/` define migration tooling.
  - `backend/scripts/migrate.sh` is the explicit operator command for `alembic upgrade head`.
  - `backend/tests/` contains pytest coverage for CORS settings, idempotency, runtime schema audit, and Alembic behavior.
- `docs/` — file-based workflow, task/report documents, project state, roadmap, technical debt, changelog, Alembic bootstrap notes, and this architecture document.
- Root `Dockerfile` and `railway.json` describe an alternative backend deployment from repository root; `backend/Dockerfile` and `backend/railway.json` describe backend deployment when Railway root directory is `backend`.

## Telegram Mini App flow
1. The user opens the app inside Telegram.
2. `frontend/src/App.tsx` reads `window.Telegram.WebApp.initData`, calls `ready()`, `expand()`, and sets Telegram WebApp colors.
3. The frontend sends `init_data` to `POST /api/v1/auth/telegram`.
4. The backend validates `init_data` signature and age using `TELEGRAM_BOT_TOKEN`.
5. The backend gets or creates the player and initial `MarinaState` in PostgreSQL.
6. Frontend actions and chat requests call `/api/v1/actions` and `/api/v1/chat`, respectively.
7. FastAPI route handlers authenticate/load the player and call service-layer functions.
8. The service layer mutates player/Marina state, persists memories/events, and returns updated response models to the route handler.

## Frontend API configuration
- The frontend API base URL is `VITE_API_URL` when set.
- If `VITE_API_URL` is absent, the current fallback is `https://web-production-9b804.up.railway.app`.
- Local Vite development runs on port `5173`.

## Backend routes
- `GET /` — returns API name/status/version.
- `GET /health` — returns app health and database connectivity state (`not_configured`, `ok`, or `error`).
- `POST /api/v1/auth/telegram` — validates Telegram init data and gets/creates a player.
- `POST /api/v1/chat` — validates Telegram init data, creates a reply, mutates relationship/calm/trust/mood/experience, stores user and Marina memories, and supports optional idempotency.
- `POST /api/v1/actions` — validates Telegram init data, applies one supported action, mutates game state/economy, stores an event memory, and supports optional idempotency.

## Authentication and identity
- Telegram-authenticated flows use `validate_init_data()` in `backend/app/telegram_auth.py`.
- The backend trusts Telegram `initData` for `/api/v1/auth/telegram`, `/api/v1/chat`, and `/api/v1/actions`.
- `TELEGRAM_BOT_TOKEN` is required for those authenticated flows.
- If `TELEGRAM_BOT_TOKEN` is absent, authenticated endpoints return an authorization error through FastAPI error handling.

## Game state, memory, and idempotency
- Primary persisted state lives in PostgreSQL tables represented by SQLAlchemy models:
  - `users` — Telegram identity, level, experience, coins, crystals.
  - `marina_states` — day/period and Marina relationship/status metrics.
  - `marina_memories` — user, Marina, and event memory rows.
  - `idempotency_records` — stored responses keyed by user, endpoint, idempotency key, and request fingerprint.
- `/api/v1/chat` and `/api/v1/actions` accept optional `idempotency_key` fields.
- When a key is supplied, the backend stores a response and SHA-256 request fingerprint.
- Reusing the same key with the same payload replays the stored response.
- Reusing the same key with a different payload returns HTTP 409.
- Frontend chat/action calls build mutation payloads with a fresh `idempotency_key` for each intentional user request.

## Migrations and database
- Runtime `Base.metadata.create_all()` is not used by FastAPI startup.
- Alembic baseline revision `20260722_0001` creates/adopts the current schema.
- The baseline handles empty databases and existing schemas created by the former runtime `create_all()` path.
- Baseline downgrade is intentionally irreversible to avoid deleting adopted pre-Alembic tables and user data.
- `DATABASE_URL` is required to run Alembic migrations online.
- Production rollout still needs validation against a PostgreSQL staging or production-like copy.

## CORS and environments
- CORS origins come from `CORS_ORIGINS`.
- Environment defaults to production/fail-closed behavior.
- Localhost origins are appended only when `ENVIRONMENT` or `APP_ENV` is explicitly one of `local`, `development`, `dev`, or `test`.

## Deployment
- Root backend Docker layout (`Dockerfile`) and backend-root layout (`backend/Dockerfile`) both install backend requirements and copy `app/`, `alembic.ini`, `alembic/`, and `scripts/` into the runtime image.
- Backend Docker command runs only `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}` and does not run Alembic migrations automatically.
- Operators run migrations separately with `./scripts/migrate.sh`, which requires `DATABASE_URL` and executes `alembic upgrade head`.
- Railway configs define Dockerfile builds and health checks; migration, API start/deploy, and `/health` verification are separate rollout steps.
- Frontend Docker builds with `npm run build` and serves `dist` using `serve` on `${PORT:-3000}`.
- Application image rollback must not use destructive database downgrade; baseline downgrade is intentionally irreversible.

## Tests and validation
- Backend tests are run with `cd backend && pytest -q`.
- Backend compile/import checks use `python -m compileall .` and FastAPI import checks.
- Alembic graph checks use `cd backend && alembic heads` and `cd backend && alembic history --verbose`.
- Frontend unit tests use `cd frontend && npm test -- --run`; production build uses `cd frontend && npm run build`.

## Current boundaries and known limitations
- Documentation changes in TASK-004 do not change runtime behavior, API contracts, UI, game balance, or database schema.
- Backend gameplay/economy logic for chat/actions is concentrated in `backend/app/game_services.py`.
- Frontend sends idempotency keys with chat/action mutation payloads.
- The former unauthenticated player helper endpoints `POST /api/v1/players` and `GET /api/v1/players/{telegram_id}` are removed; player creation/loading happens through Telegram-authenticated flows only.
- Deployment does not automatically run Alembic migrations; operators must run/verify `./scripts/migrate.sh` separately before API rollout and `/health` verification.
- PostgreSQL migration rollout needs staging/production-like validation.
