# Technical Debt

## High
- Run `alembic upgrade head` against the real Railway production PostgreSQL database, then verify `idempotency_records` exists and action/day idempotent mutations no longer raise `UndefinedTableError`; repository SQLite tests cover clean and baseline-stamped missing-table paths, but Codex cannot access the live production DB.

## Low
- Marina memory relevance is deterministic keyword/token matching; richer semantic recall remains future work if product scope requires it, without adding external AI services by default.
- Expand end-to-end coverage beyond the current mutation payload unit tests and critical auth/chat/action/action-error-retry/day-advance/emotion integration tests.
- Review React rendering and bundle performance after the UI polish and emotion mapping changes.
- Confirm the TASK-015 Railway frontend build fix in an actual Railway Alpine/musl deployment; local `npm ci` and build plus lockfile analysis validate the repository state, but this container lacks Docker/Railway runtime validation.
- Confirm the backend Railway runtime variable `CORS_ORIGINS` is set to the exact production frontend origin after TASK-016 is merged/deployed; Codex verified the current public backend rejects generic preflight requests but cannot edit Railway variables from this repository.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
