# Technical Debt

## High
- Run the Alembic baseline upgrade and irreversible-downgrade failure path against a staging/production-like PostgreSQL database copy before production rollout; SQLite coverage verifies the existing-schema and data-preservation paths, but PostgreSQL rollout still needs environment-specific validation.

## Low
- Marina memory relevance is deterministic keyword/token matching; richer semantic recall remains future work if product scope requires it, without adding external AI services by default.
- Expand end-to-end coverage beyond the current mutation payload unit tests and critical auth/chat/action/action-error-retry/day-advance/emotion integration tests.
- Review React rendering and bundle performance after the UI polish and emotion mapping changes.
- Confirm the TASK-015 Railway frontend build fix in an actual Railway Alpine/musl deployment; local `npm ci` and build plus lockfile analysis validate the repository state, but this container lacks Docker/Railway runtime validation.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
