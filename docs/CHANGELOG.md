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

## TASK-008 — Safe Alembic deployment workflow
- Added `backend/scripts/migrate.sh` as an explicit operator command that requires `DATABASE_URL` and runs only `alembic upgrade head`.
- Updated root and backend Dockerfiles to include Alembic config, migration revisions and backend scripts in supported backend runtime images.
- Added static tests proving Alembic assets are copied, migration command is separate/upgrade-only, and API startup does not run hidden migrations.
- Updated deployment documentation to separate migration, API start/deploy, health check and safe application rollback boundaries.

## TASK-009 — Frontend idempotency payload tests
- Added Vitest as a lightweight frontend unit-test runner with a non-watch `npm test -- --run` workflow.
- Added unit tests for idempotency key generation, `crypto.randomUUID()` usage, fallback behavior, field preservation, and stable reuse of constructed mutation payloads.
- Updated frontend/project documentation to record the tested mutation payload behavior without changing UI, backend API, gameplay, or database schema.
## TASK-010 — Frontend auth/chat/action integration tests
- Added Vitest/jsdom React integration tests for Telegram auth success and error loading states with mocked Telegram WebApp and fetch.
- Added integration tests for chat and action requests, including `init_data`, non-empty `idempotency_key`, successful state updates, pending action duplicate protection, and chat HTTP error recovery.
- Added Testing Library/jsdom devDependencies only and updated frontend/project documentation without changing UI, backend API, gameplay, idempotency semantics or database schema.
## TASK-011 — Marina personality and memory response policy
- Added `backend/app/personality.py` for deterministic local chat intent classification, emotional-tone variants and safe recent user-memory selection without external AI services.
- Updated chat service orchestration to use the personality policy while preserving `/api/v1/chat` response schema, state mutation bounds, memory persistence and idempotency behavior.
- Added backend tests for intent classification, emotional-state tone differences, safe memory selection/filtering, current-message exclusion, chat persistence/schema, and idempotent replay/conflict regression coverage.

## TASK-012 — Safe day-period progression
- Added deterministic Marina period advancement over existing `day`/`period` fields without database schema or Alembic changes.
- Added Telegram-authenticated `POST /api/v1/day/advance` with persisted idempotency, one event memory per real transition, and HTTP 409 same-key/different-payload conflict handling.
- Added frontend `Продолжить день` control with idempotency payloads, pending duplicate protection, success state updates, haptic success, and error recovery.
- Added backend and frontend tests for period cycle, clamped state deltas, auth/idempotency behavior, memory persistence, and UI request/update/error flows.

## TASK-013 — Frontend interface, emotion and state polish
- Centralized frontend emotion display mapping for supported backend emotion keys, including safe visual fallbacks for `love`, `caring` and unknown emotion values.
- Polished the Telegram Mini App screen hierarchy with a compact HUD, clearer day-advance control, period-aware CSS scene tones, action card pending/disabled/success feedback, muted non-interactive navigation placeholders and chat/accessibility improvements.
- Reformatted `frontend/src/index.css` with CSS custom properties, safe-area handling, mobile layout rules, focus-visible styling and reduced-motion support without adding runtime dependencies.
- Expanded Vitest/jsdom integration coverage for emotion synchronization, unknown fallback, day/action pending states, inactive controls and accessibility attributes.

## TASK-014 — Action mutation error recovery
- Replaced raw action failure display with centralized user-safe Russian error mapping for network/`Load failed`, auth, conflict, validation/unavailable, server and unknown failures.
- Added last failed action retry from the error panel; retry creates a fresh mutation payload/idempotency key and applies backend state only after confirmed success.
- Added structured safe action diagnostics without Telegram `init_data` or secrets.
- Expanded frontend integration tests and backend action endpoint regression tests for coffee success, auth rejection, idempotent replay, conflict 409 and action response contract.

## TASK-015 — Railway frontend Rollup musl build fix
- Added the Rollup Linux x64 musl native package as a locked optional frontend dependency so Railway Alpine/Linux musl installs can resolve Rollup's native loader deterministically.
- Added frontend Node/npm engine constraints and changed `frontend/Dockerfile` build install to `npm ci --include=dev --include=optional` before `npm run build`.
- Documented the Railway frontend root/build expectations and post-deploy verification without adding a user-visible debug banner.

## TASK-016 — Production frontend/backend connectivity diagnosis
- Centralized frontend API base URL normalization and endpoint construction in `frontend/src/apiConfig.ts` for auth, chat, action and day-advance requests.
- Added safe structured action request diagnostics that distinguish network failures from HTTP responses without logging Telegram `init_data` or secrets.
- Added frontend API URL/action diagnostics tests and backend CORS preflight tests for configured and unconfigured production origins.
- Documented that production backend `CORS_ORIGINS` must include the exact frontend origin; current public backend preflight rejection explains Telegram WebView network/fetch failures despite `/health` being reachable.

## TASK-017 — Production idempotency migration repair
- Added Alembic revision `20260723_0002` as the current head to safely ensure `idempotency_records` exists when a production-like database was already stamped at baseline but missed the idempotency table.
- Added regression tests for clean upgrade, repeated upgrade, baseline-stamped missing-table repair, model/schema column parity, and action idempotency after an Alembic-created schema.
- Documented the exact Railway migration commands and clarified that production success still requires an operator to run `alembic upgrade head` against the real PostgreSQL database.

## TASK-018 — Compact top status bar
- Reworked the frontend top HUD into a more compact mobile layout with day/time/period in one card, a shorter day-advance control and compact horizontally accessible stat cards.
- Preserved all required status data and progress meters while reducing mobile vertical spacing and keeping page-level horizontal overflow disabled.
- Added Vitest/jsdom coverage for compact HUD structure, all five key stats and day-advance accessibility behavior.

## TASK-019 — Railway production main auto deploy policy
- Audited repository Railway config files, Dockerfiles and GitHub CI workflow and confirmed they do not encode a production `task-*` branch source.
- Documented that Railway connected branch and automatic deployment trigger are service UI settings: frontend and backend production services must track `main`, with automatic deploys enabled after merges to `main`.
- Added an operator checklist and release guardrail to prevent production from staying attached to temporary task branches.
