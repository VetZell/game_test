# Task
TASK-016 — Найти и устранить причину сетевого отказа Frontend → Backend в Telegram Mini App

## Status
SUCCESS

## Summary
- Audited the production action path across frontend API URL selection, generated bundle output, action/chat/day/auth fetch calls, Railway frontend build config, backend `/health`, backend `/api/v1/actions`, and CORS settings.
- Confirmed the production bundle without `VITE_API_URL` contains the fallback backend base URL `https://web-production-9b804.up.railway.app` and action path `/api/v1/actions`; the generated bundle contains no Telegram `init_data` or bot token strings.
- Confirmed the public backend URL is reachable: `GET https://web-production-9b804.up.railway.app/health` returned HTTP 200 with `database: ok`.
- Found the production connectivity blocker available from this environment: backend CORS preflight rejects an Origin-bearing action request before JavaScript can receive an HTTP action response. `OPTIONS https://web-production-9b804.up.railway.app/api/v1/actions` with `Origin` and `Access-Control-Request-Method: POST` returned HTTP 400, no `Access-Control-Allow-Origin`, and body `Disallowed CORS origin`.
- Added centralized frontend API base URL normalization and endpoint construction so auth, chat, action, and day-advance requests use one deterministic URL path builder.
- Added safe structured action diagnostics for developer console/logging: frontend origin, API base URL, endpoint, method, elapsed time, HTTP status when present, and error category/name/message without Telegram `init_data`, cookies, tokens or secrets.
- Added tests proving production fallback URL selection, configured `VITE_API_URL`, URL normalization, correct action endpoint, retry endpoint reuse, and HTTP-vs-network action error classification.
- Added backend CORS preflight tests proving configured production origins allow `/api/v1/actions` preflight and unconfigured origins are rejected.

## Files Changed
- `frontend/src/apiConfig.ts` — new centralized API base URL normalization, endpoint builder, and safe diagnostic URL helper.
- `frontend/src/apiConfig.test.ts` — new Vitest unit tests for production fallback, configured `VITE_API_URL`, URL normalization and diagnostic URL sanitization.
- `frontend/src/App.tsx` — uses shared API endpoint builder for auth/chat/action/day-advance and logs structured safe action diagnostics with elapsed time and category.
- `frontend/src/App.integration.test.tsx` — updated integration assertions for shared API base URL, action retry endpoint reuse, and HTTP-vs-network diagnostics.
- `backend/tests/test_settings.py` — added HTTP-level CORS preflight tests for configured and unconfigured production origins.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/TASK.md`, `docs/REPORT.md` — documentation updated for TASK-016 findings, requirements and status.

## Problems Found
- The production backend host used by the bundle is reachable over HTTPS, so the observed frontend failure is not explained by DNS/TLS/backend health for `https://web-production-9b804.up.railway.app`.
- The action path in the production bundle is `/api/v1/actions`, so the observed failure is not explained by a wrong action path or double slash.
- A real public preflight check against the backend action endpoint returns HTTP 400 with no `Access-Control-Allow-Origin`; browsers and Telegram WebView surface this CORS preflight rejection to `fetch()` as a network failure, which matches the user-visible `Не удалось подключиться к серверу.`.
- Repository code cannot edit Railway runtime variables; if production frontend origin is missing from backend `CORS_ORIGINS`, a deploy alone will not make browser preflight succeed.

## Problems Fixed
- API base URL and endpoint construction are now centralized in `frontend/src/apiConfig.ts`; auth/bootstrap, chat, action and day advance use the same normalized base URL and endpoint builder.
- Frontend action diagnostics now distinguish `network`, `timeout`, `http` and `unknown` categories. HTTP 401/409/422/500 responses retain HTTP classification instead of being treated as no connection.
- Action diagnostics include safe frontend/backend URL data, method, elapsed time, HTTP status when available and error name/message without logging Telegram `init_data` or secrets.
- Backend CORS behavior is covered by preflight tests, documenting the exact required production behavior: `CORS_ORIGINS` must include the exact frontend origin for `/api/v1/actions` preflight to return 200.
- README and architecture docs now explicitly state the required production pairing: frontend `VITE_API_URL=https://<backend-public-domain>` and backend `CORS_ORIGINS=https://<frontend-public-domain>`.

## Production URL / Path Evidence
- Before fix/audit: generated bundle fallback API base URL was confirmed as `https://web-production-9b804.up.railway.app`; action endpoint path was confirmed as `/api/v1/actions`.
- Public backend health: `GET https://web-production-9b804.up.railway.app/health` returned HTTP 200 and `{"status":"ok","database":"ok"}`.
- Public backend preflight: `OPTIONS https://web-production-9b804.up.railway.app/api/v1/actions` with an Origin header returned HTTP 400, no `Access-Control-Allow-Origin`, and `Disallowed CORS origin`.
- After fix: repository code still builds the same valid HTTPS backend base URL/path unless `VITE_API_URL` is provided, but endpoint generation is centralized and tested; successful production connectivity additionally requires backend Railway `CORS_ORIGINS` to include the deployed frontend origin.

## Tests
- PASS — `git status --short --branch`
- PASS — `git diff --check`
- PASS — `cd frontend && rm -rf node_modules dist && npm ci`
- PASS — `cd frontend && npm test -- --run`
- PASS — `cd frontend && npm run build`
- PASS — generated production bundle inspection for `https://web-production-9b804.up.railway.app`, `/api/v1/actions`, and absence of Telegram secret strings.
- PASS — `cd backend && pytest -q`
- PASS — `cd backend && python -m compileall .`
- PASS — `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- PASS — `cd backend && alembic heads`
- PASS — public `GET https://web-production-9b804.up.railway.app/health` returned HTTP 200.
- PASS — public `OPTIONS https://web-production-9b804.up.railway.app/api/v1/actions` reproduced the CORS blocker with HTTP 400 and no `Access-Control-Allow-Origin`.

## Risks
- Codex cannot read or edit Railway runtime variables from the repository. The code/docs/tests now identify and cover the required CORS behavior, but the real backend service must have `CORS_ORIGINS` set to the exact production frontend origin for browser/Telegram WebView action requests to pass preflight.
- The public preflight check used a safe synthetic Origin, not a real Telegram user action and not Telegram `init_data`; this avoids production mutation and secret exposure.

## Technical Debt
- Verify in Railway after merge/deploy that backend `CORS_ORIGINS` exactly matches the production frontend origin and that action preflight returns 200 for that origin.
- Existing PostgreSQL staging/production-like Alembic validation debt remains unchanged.

## Safe To Merge
YES

## Commit / PR
- Implementation commit: TBD
- Pull Request: TBD
