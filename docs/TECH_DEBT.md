# Technical Debt

## High
- Run the Alembic baseline upgrade and irreversible-downgrade failure path against a staging/production-like PostgreSQL database copy before production rollout; SQLite coverage verifies the existing-schema and data-preservation paths, but PostgreSQL rollout still needs environment-specific validation.
- Current Docker startup commands do not run Alembic migrations automatically and the backend Docker build context does not copy Alembic assets into the runtime image; production migration execution remains a manual/operational step until deployment workflow is explicitly designed.

## Low
- Expand end-to-end and frontend coverage.
- Review React rendering and bundle performance.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
