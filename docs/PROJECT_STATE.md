# Project State

## Repository
- Name: `VetZell/game_test`
- Default branch: `main`
- Product: Telegram Mini App «День Марины»

## Frontend
- React 18 + TypeScript + Vite Telegram Mini App frontend.
- Entry point: `frontend/src/main.tsx`; current app shell and gameplay UI live primarily in `frontend/src/App.tsx`.
- The frontend initializes Telegram WebApp APIs, reads `initData`, authenticates through the backend, renders Marina visuals from `frontend/public/marina/` assets through a centralized emotion display mapping, and calls backend chat/action/day-advance endpoints.
- API base URL is centralized in `frontend/src/apiConfig.ts`: `VITE_API_URL` is normalized when present, otherwise code falls back to `https://web-production-9b804.up.railway.app`; auth, chat, action and day-advance endpoints are built through the shared helper.
- Chat/action/day-advance frontend requests include backend-compatible `idempotency_key` values generated per intentional user mutation; action failures are converted to safe user-facing messages with retry support and safe structured developer diagnostics; helper/API URL behavior is covered by Vitest unit tests and critical Telegram auth/chat/action/action-error-retry/compact-HUD/day-advance/emotion React flows are covered by Vitest/jsdom integration tests with mocked Telegram WebApp and fetch.

## Backend
- FastAPI + async SQLAlchemy + PostgreSQL.
- Entry point: `backend/app/main.py`; deployment command runs `uvicorn app.main:app`. Chat/action/day-advance route handlers now delegate gameplay/economy/period mutations to `backend/app/game_services.py`, and chat replies delegate deterministic intent/emotional-tone/memory policy to `backend/app/personality.py`.
- Runtime schema creation has been removed from the FastAPI lifespan; schema management is represented by Alembic configuration and a baseline migration that handles empty databases and existing create_all-created schemas.
- The baseline downgrade is intentionally irreversible to prevent accidental deletion of adopted pre-Alembic tables and user data.
- Production CORS origins are read from `CORS_ORIGINS`; localhost origins are denied by default and added only when `ENVIRONMENT`/`APP_ENV` explicitly selects a local/development/test environment. Production frontend action requests require `CORS_ORIGINS` to include the exact frontend public origin so `/api/v1/actions` preflight succeeds.
- Economy-changing chat/action requests and day-period advancement support optional idempotency keys backed by persisted idempotency records with request fingerprints; reusing a key with a different payload returns HTTP 409.
- Telegram authentication is enforced for `/api/v1/auth/telegram`, `/api/v1/chat`, `/api/v1/actions`, and `/api/v1/day/advance` through `TELEGRAM_BOT_TOKEN` validation.
- Marina day progression uses existing `day`/`period` fields with deterministic `morning → day → evening → night → morning` transitions, small clamped need deltas, event-memory persistence, and no database schema changes.
- Former unauthenticated player helper endpoints `POST /api/v1/players` and `GET /api/v1/players/{telegram_id}` have been removed; player records are created or loaded through Telegram-authenticated auth/chat/action flows.

## Database and Migrations
- `DATABASE_URL` configures the async database engine; `postgres://` and `postgresql://` URLs are converted to `postgresql+asyncpg://`.
- Alembic revision `20260722_0001` covers `users`, `marina_states`, `marina_memories`, and the initial `idempotency_records` schema.
- Alembic revision `20260723_0002` is the current head and safely ensures `idempotency_records` exists for production-like databases already stamped at baseline without that table.
- Migration application is an explicit operational step via `backend/scripts/migrate.sh` or `alembic upgrade head`; Docker startup commands do not run Alembic automatically.

## Deployment
- Root and backend Dockerfiles include Alembic assets plus `scripts/` in the backend runtime image and run the FastAPI backend with Uvicorn only.
- Frontend Dockerfile builds static Vite output with deterministic `npm ci --include=dev --include=optional`, includes the locked Rollup Linux x64 musl optional package for Railway Alpine builds, and serves `dist` with `serve`.
- Railway JSON files define Dockerfile builders and healthcheck paths for root/backend/frontend deployment layouts; frontend Railway root remains `frontend`, while backend migrations are run separately before API deploy/start and `/health` verification. Railway production service source-branch/auto-deploy toggles are not stored in these files and must be set in Railway UI: frontend and backend production services track `main`, not `task-*` branches.

## Current Workflow
- ChatGPT writes the active task into `docs/TASK.md`.
- Codex executes it according to `docs/CODEX_PROTOCOL.md` when the status is `READY`.
- Codex writes results into `docs/REPORT.md`.
- The short command `выполни` executes the active ready task without merge; `слей` is the only merge authorization command.

## Current Focus
- Keep architecture documentation synchronized with the verified repository state.
- Preserve runtime behavior while documenting confirmed limitations and future work.

## Known Issues
- Full production migration execution still requires a real Railway/PostgreSQL operator run of `alembic upgrade head`; repository tests cover SQLite clean and production-like missing-`idempotency_records` paths, but Codex cannot claim the live production DB has been migrated.
- Chat/action gameplay orchestration lives in `backend/app/game_services.py`; deterministic Marina chat personality/memory policy lives in `backend/app/personality.py`; public player helper endpoints are no longer exposed.

## TASK-013 Frontend UI State
- The main Telegram Mini App screen now has a polished HUD, period-aware scene styling, synchronized emotion label/visual/tone mapping, clearer action cards, explicit day-advance target text, non-interactive placeholders for unavailable navigation sections, safe-area CSS, focus-visible styling, reduced-motion support and updated integration coverage.
- No backend API, database schema, Alembic revision, auth, idempotency semantics, personality policy or action economy changed in TASK-013.

## TASK-014 Action Error Recovery
- Action mutation failures now use centralized frontend status/network mapping, safe developer diagnostics, retry with a new idempotency key, and preserved local player state until a confirmed backend success.
- Backend action regression coverage explicitly verifies coffee success, Telegram auth rejection, idempotent replay, conflict 409 and response contract.

## TASK-015 Railway Frontend Build
- Frontend dependency installation is pinned to Node `>=20.19.0 <23` and npm `>=10 <12`, the Railway frontend Docker build uses `npm ci --include=dev --include=optional`, and the lockfile explicitly contains `@rollup/rollup-linux-x64-musl@4.62.2` for Alpine/Linux musl Rollup resolution.
- New frontend deployment can be distinguished from the stale deployment by verifying TASK-014 action error recovery behavior in the Mini App without adding a user-visible debug banner.

## TASK-016 Frontend Backend Connectivity
- TASK-016 identified the production network/fetch failure as CORS preflight rejection: the public backend `/health` was reachable, but an `OPTIONS /api/v1/actions` preflight with an Origin header returned HTTP 400 with no `Access-Control-Allow-Origin`, which browsers surface as a network failure.
- The frontend now centralizes API URL normalization/endpoint construction and logs safe action diagnostics with origin, API base URL, endpoint, method, elapsed time, HTTP status when available and error category without Telegram `init_data` or secrets.
- Repository tests cover production fallback URL selection, configured `VITE_API_URL`, endpoint normalization, retry URL reuse, HTTP-vs-network classification and backend CORS preflight behavior for configured/unconfigured origins.


## TASK-017 Production Idempotency Migration
- TASK-017 found that a migration already existed in the baseline, but backend startup intentionally does not run Alembic automatically; a production database can therefore be stamped/apparently current while still missing `idempotency_records` if the explicit migration step was not run after the idempotency schema landed.
- Current Alembic head is `20260723_0002`, a follow-up non-destructive revision that creates/repairs `idempotency_records` without manual SQL or runtime `create_all()`.
- Operators still must run the Railway backend migration command against the real production PostgreSQL database before claiming production success.

## TASK-018 Compact Status Bar
- The top mobile HUD is now shorter: time/day/period share one compact line/card, the day-advance button uses shorter copy while keeping an accessible label, and Love/Mood/Hunger/Energy/Calm stats are compact cards with thinner progress meters in a horizontally scrollable mobile row.
- Scene content starts after a smaller HUD gap/padding while desktop/tablet keeps a two-column HUD and the same scene/action/navigation structure.

## TASK-019 Railway Main Auto Deploy
- Repository deployment config was audited for branch-specific production settings: `railway.json`, `frontend/railway.json`, `backend/railway.json`, Dockerfiles and `.github/workflows/ci.yml` do not pin production to a `task-*` branch.
- The confirmed deployment blocker is Railway service UI/source configuration shown by the user: production was connected to a task branch, so merges to `main` could not trigger production automatically. Codex cannot change Railway UI without Railway project credentials, so the repository now documents the operator checklist and invariant `production source branch = main` for both frontend and backend services.
