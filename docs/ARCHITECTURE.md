# Architecture

## Purpose
«День Марины» is a Telegram Mini App game: a cozy relationship simulator where the player interacts with Marina, changes Marina/player state, and receives persisted conversation memory.

## Repository layout
- `frontend/` — React + TypeScript + Vite Telegram Mini App frontend.
  - `frontend/src/main.tsx` mounts React and imports global styles.
  - `frontend/src/App.tsx` contains the current single-page game shell, Telegram WebApp initialization, API calls, local UI state, centralized emotion display mapping, compact top HUD/status bar, Marina visuals, action cards, day-advance control, and chat overlay.
  - `frontend/src/mutationPayload.ts` builds chat/action/day-advance mutation payloads with per-request `idempotency_key` values.
  - `frontend/src/mutationPayload.test.ts` covers idempotency key generation and mutation payload behavior with Vitest in Node mode.
  - `frontend/src/App.integration.test.tsx` covers Telegram-auth, chat, action, action error mapping/retry, day-advance, emotion fallback/synchronization, pending/disabled controls, inactive navigation and error-recovery flows with mocked Telegram WebApp and fetch in Vitest/jsdom.
  - `frontend/src/telegram.d.ts` declares the Telegram WebApp browser API used by the app.
  - `frontend/public/marina/` and `frontend/public/marina/v2/` contain Marina image assets and manifests.
  - `frontend/Dockerfile`, `frontend/railway.json`, and `frontend/serve.json` describe the static frontend deployment.
- `backend/` — FastAPI backend with PostgreSQL persistence.
  - `backend/app/main.py` defines the FastAPI app, CORS middleware, health/root endpoints, Telegram auth endpoint, and thin chat/action/day-advance route handlers.
  - `backend/app/game_services.py` orchestrates chat/action/day-period state mutation, persistence, idempotent response models, and delegates deterministic Marina chat personality/memory response policy.
  - `backend/app/personality.py` contains deterministic local intent classification, emotional-tone response variants, and safe recent user-memory selection for chat replies.
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
6. Frontend actions, chat, and day progression call `/api/v1/actions`, `/api/v1/chat`, and `/api/v1/day/advance`, respectively.
7. FastAPI route handlers authenticate/load the player and call service-layer functions.
8. The chat service classifies message intent, selects a safe relevant prior user memory when applicable, applies state changes, persists user/Marina memories, and returns the existing response model.
9. The action service mutates player/Marina state, persists event memories, and returns updated response models to the route handler. The day service advances `morning → day → evening → night → morning`, increments the day only after night, applies small clamped need deltas, and persists one event memory.

## Frontend API configuration
- The frontend API base URL is centralized in `frontend/src/apiConfig.ts`: `VITE_API_URL` is used when set, otherwise the safe fallback remains `https://web-production-9b804.up.railway.app`.
- `apiConfig.ts` normalizes trailing slashes and every auth/chat/action/day-advance request builds its endpoint through `apiEndpoint()`, preventing double-slash path drift.
- Production frontend/backend connectivity requires the backend runtime `CORS_ORIGINS` to contain the exact frontend origin; otherwise browser/Telegram WebView preflight fails before an HTTP response reaches the app and the frontend correctly classifies it as a network failure.
- Action request failures log safe developer diagnostics only: frontend origin, API base URL, endpoint path, method, elapsed time, HTTP status when present and error category/name/message, without Telegram `init_data` or secrets.
- Local Vite development runs on port `5173`.

## Backend routes
- `GET /` — returns API name/status/version.
- `GET /health` — returns app health and database connectivity state (`not_configured`, `ok`, or `error`).
- `POST /api/v1/auth/telegram` — validates Telegram init data and gets/creates a player.
- `POST /api/v1/chat` — validates Telegram init data, creates a reply, mutates relationship/calm/trust/mood/experience, stores user and Marina memories, and supports optional idempotency.
- `POST /api/v1/actions` — validates Telegram init data, applies one supported action, mutates game state/economy, stores an event memory, and supports optional idempotency.
- `POST /api/v1/day/advance` — validates Telegram init data, advances Marina to the next day period using existing `day`/`period` fields, applies clamped need deltas only, stores one event memory, and supports optional idempotency.

## Authentication and identity
- Telegram-authenticated flows use `validate_init_data()` in `backend/app/telegram_auth.py`.
- The backend trusts Telegram `initData` for `/api/v1/auth/telegram`, `/api/v1/chat`, `/api/v1/actions`, and `/api/v1/day/advance`.
- `TELEGRAM_BOT_TOKEN` is required for those authenticated flows.
- If `TELEGRAM_BOT_TOKEN` is absent, authenticated endpoints return an authorization error through FastAPI error handling.

## Game state, memory, and idempotency
- Primary persisted state lives in PostgreSQL tables represented by SQLAlchemy models:
  - `users` — Telegram identity, level, experience, coins, crystals.
  - `marina_states` — day/period and Marina relationship/status metrics.
  - `marina_memories` — user, Marina, and event memory rows.
  - `idempotency_records` — stored responses keyed by user, endpoint, idempotency key, and request fingerprint.
- `/api/v1/chat`, `/api/v1/actions`, and `/api/v1/day/advance` accept optional `idempotency_key` fields.
- When a key is supplied, the backend stores a response and SHA-256 request fingerprint.
- Reusing the same key with the same payload replays the stored response.
- Reusing the same key with a different payload returns HTTP 409.
- Frontend chat/action/day-advance calls build mutation payloads with a fresh `idempotency_key` for each intentional user request. Action failures are mapped to user-safe Russian messages, store the last failed action for one-click retry, and retry creates a new idempotency key.

## Migrations and database
- Runtime `Base.metadata.create_all()` is not used by FastAPI startup.
- Alembic baseline revision `20260722_0001` creates/adopts the original current schema.
- Follow-up revision `20260723_0002` is the current head and ensures `idempotency_records` exists for databases that were already stamped at the baseline revision but missed the table in production.
- The migration path handles empty databases, existing schemas created by the former runtime `create_all()` path, and production-like baseline-stamped databases missing only `idempotency_records`.
- Baseline and idempotency follow-up downgrades are intentionally irreversible to avoid deleting adopted pre-Alembic tables, user data, or replay records.
- `DATABASE_URL` is required to run Alembic migrations online.
- Production rollout still needs validation against a PostgreSQL staging or production-like copy.

## CORS and environments
- CORS origins come from `CORS_ORIGINS`.
- Environment defaults to production/fail-closed behavior.
- Localhost origins are appended only when `ENVIRONMENT` or `APP_ENV` is explicitly one of `local`, `development`, `dev`, or `test`.

## Deployment
- Root backend Docker layout (`Dockerfile`) and backend-root layout (`backend/Dockerfile`) both install backend requirements and copy `app/`, `alembic.ini`, `alembic/`, and `scripts/` into the runtime image.
- Backend Docker command runs only `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}` and does not run Alembic migrations automatically.
- Operators run migrations separately with `./scripts/migrate.sh` or the Railway shell command `alembic upgrade head`, both requiring `DATABASE_URL`; root-directory deployments should run `cd backend && alembic upgrade head`.
- Railway configs define Dockerfile builds and health checks; migration, API start/deploy, and `/health` verification are separate rollout steps.
- Railway connected branch and automatic deployment settings are Railway service UI state, not repository JSON state; production frontend and backend services must use source branch `main` with automatic deploys enabled, while `task-*` branches are PR/preview-only.
- The GitHub `CI` workflow runs on pushes and pull requests targeting `main`; if Railway `Wait for CI` is enabled, operators must verify the required workflow exists and passes so production deploys are not blocked.
- Frontend Docker builds with `npm run build` and serves `dist` using `serve` on `${PORT:-3000}`.
- Application image rollback must not use destructive database downgrade; baseline downgrade is intentionally irreversible.

## Tests and validation
- Backend tests are run with `cd backend && pytest -q`; personality/memory policy coverage lives in `backend/tests/test_personality.py` and chat orchestration regressions in `backend/tests/test_game_services.py`.
- Backend compile/import checks use `python -m compileall .` and FastAPI import checks.
- Alembic graph checks use `cd backend && alembic heads` and `cd backend && alembic history --verbose`.
- Frontend unit and integration tests use `cd frontend && npm test -- --run`; production build uses `cd frontend && npm run build`.

## Current boundaries and known limitations
- Documentation changes in TASK-004 do not change runtime behavior, API contracts, UI, game balance, or database schema.
- Backend chat orchestration remains in `backend/app/game_services.py`, while deterministic Marina personality and safe memory-selection policy is isolated in `backend/app/personality.py`; action economy remains in `game_services.py`.
- Frontend sends idempotency keys with chat/action/day-advance mutation payloads, uses a centralized emotion key → label → visual/tone mapping with repository asset fallbacks, and React-level Vitest/jsdom integration tests cover critical mocked auth, chat, action, compact HUD/status stats, day-advance, emotion and accessibility flows.
- The former unauthenticated player helper endpoints `POST /api/v1/players` and `GET /api/v1/players/{telegram_id}` are removed; player creation/loading happens through Telegram-authenticated flows only.
- Deployment does not automatically run Alembic migrations; operators must run/verify `./scripts/migrate.sh` separately before API rollout and `/health` verification.
- PostgreSQL migration rollout needs staging/production-like validation.

## TASK-013 UI polish notes
- Emotion keys `love` and `caring` intentionally reuse existing repository visuals (`happy` and `thoughtful`) because no separate image files are present for those exact keys.
- The bottom navigation exposes only the working home control as an interactive button; unavailable sections are visually muted non-interactive placeholders.
- `frontend/src/index.css` is formatted with custom properties, safe-area padding, period-aware scene classes, focus-visible styles, and reduced-motion handling.

## TASK-014 action error recovery
- Action request failures are centrally mapped in `frontend/src/App.tsx`: network/`Load failed`, auth, conflict, validation/unavailable and server errors no longer display raw technical text to users.
- The action error panel offers `Повторить` for the last failed action; retry rebuilds the mutation payload with a fresh idempotency key and does not mutate local state until the backend returns success.
- Developer diagnostics use structured `console.error` with endpoint/status/safe detail and do not include Telegram `init_data` or secrets.

## TASK-018 compact top HUD
- The top HUD uses `compact-hud`, `compact-time-card`, `compact-advance-button`, `compact-stats-row`, `compact-mini-stat` and `compact-meter` structure so mobile CSS can keep day/time/period, next-period action and five key stats visible without tall stacked cards.
- At mobile widths the stats row scrolls horizontally inside the HUD while page-level `overflow-x` remains hidden, preserving access to all stats without creating whole-page horizontal overflow.

## TASK-019 Railway production deploy source
- Repository audit found `railway.json`, `frontend/railway.json`, and `backend/railway.json` contain Dockerfile/healthcheck/restart settings only and no branch selector; the observed production service attachment to `task-017-production-idempotency-migration` is therefore Railway UI/source configuration rather than repository config.
- Production release invariant: frontend and backend Railway production services must be connected to `main`, have automatic deploys enabled for `main`, and must not use `task-*` branches except for separately configured preview environments.
