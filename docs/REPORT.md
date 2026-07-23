# Task
TASK-014 — Исправить выполнение игровых действий и понятную обработку ошибок

## Status
SUCCESS

## Summary
- Audited the frontend action path, mutation payload helper, action integration tests, backend `/api/v1/actions` route, action service, schemas, Telegram auth, persisted idempotency and API URL usage.
- Found the exact user-visible `Load failed` cause: action `fetch()` network rejections/Telegram WebView load failures were displayed directly via `reason.message` in `performAction()`, so raw technical browser errors reached the UI.
- Added centralized frontend action error mapping for network/`Load failed`, auth, conflict, validation/unavailable, server and unknown failures.
- Preserved previous player/Marina state on action errors, reset pending state reliably, restored the emotion visual after failed temporary action visuals, and added one-click retry for the last failed action.
- Retry creates a fresh mutation payload and a fresh `idempotency_key`; local state is applied only after a confirmed backend success.
- Added structured safe developer diagnostics for action failures without Telegram `init_data`, bot tokens or secrets.
- Added frontend and backend regression coverage for successful coffee action, friendly error mapping, retry behavior, idempotency replay/conflict, auth rejection and response contract.

## Files Changed
- `frontend/src/App.tsx` — centralized action error mapping, safe diagnostics, retry state, retry button behavior, pending cleanup and preserved local state on failures.
- `frontend/src/index.css` — styled the action error panel retry button and disabled state.
- `frontend/src/App.integration.test.tsx` — added action network/auth/server/conflict/validation error, retry, new idempotency key and false-local-success regression coverage.
- `backend/tests/test_action_endpoint_regression.py` — added HTTP-level backend action regression tests for coffee success, auth rejection, idempotent replay, conflict 409 and response contract.
- `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/TASK.md`, `docs/REPORT.md` — documentation updated for TASK-014.

## Problems Found
- `performAction()` caught any failure and rendered `reason.message`; in WebKit/Telegram WebView network-load failures can produce the raw text `Load failed`.
- Action HTTP error handling reused backend/raw detail text directly, which could expose technical or unhelpful messages in the UI.
- There was no retry control for a failed action mutation; users had to tap an action again without clear recovery guidance.
- Action error diagnostics were not structured by endpoint/status/safe detail.

## Problems Fixed
- Network `TypeError`, `Load failed`, `Failed to fetch` and similar errors now display `Не удалось подключиться к серверу.`.
- HTTP 401/403 displays `Не удалось подтвердить авторизацию Telegram.`.
- HTTP 409 displays a conflict/retry-safe user message without applying a false success.
- HTTP 400/422 displays `Действие сейчас выполнить нельзя.`.
- HTTP 500+ displays `Сервер временно недоступен. Попробуйте ещё раз.`.
- Unknown action failures display `Не удалось выполнить действие.`.
- The error panel now includes `Повторить` for the last failed action; retry uses a fresh idempotency key and clears stale errors before the new attempt.
- Failed actions preserve the previous player stats/emotion/message, remove pending state and restore the prior emotion visual.
- Backend action behavior and contracts were preserved and covered with HTTP-level regression tests.

## Tests
- PASS — `git status --short --branch`
- PASS — `git diff --check`
- PASS — `cd frontend && npm install`
- PASS — `cd frontend && npm test -- --run`
- PASS — `cd frontend && npm run build`
- PASS — `cd backend && pytest -q`
- PASS — `cd backend && python -m compileall .`
- PASS — `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- PASS — `cd backend && alembic heads`

## Risks
- Browser/network error wording differs between engines; mapping checks both `TypeError` and common raw fetch/load phrases so user-facing output stays stable.
- Retry is intentionally limited to the last failed action mutation and creates a new idempotency key because the previous request was not confirmed successful by the frontend.

## Technical Debt
- Existing PostgreSQL staging/production-like Alembic validation debt remains unchanged.
- Broader end-to-end coverage remains future work beyond mocked Vitest/jsdom action failure/retry tests.

## Safe To Merge
YES

## Commit / PR
- Implementation commit: 5c508c1d88ebd6ae8df1756883c2c330cd367cad
- Pull Request: https://github.com/VetZell/game_test/pull/13
