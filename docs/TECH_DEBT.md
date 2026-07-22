# Technical Debt

## High
- Run the Alembic baseline upgrade and irreversible-downgrade failure path against a staging/production-like PostgreSQL database copy before production rollout; SQLite coverage verifies the existing-schema and data-preservation paths, but PostgreSQL rollout still needs environment-specific validation.

## Low
- Expand end-to-end coverage and broader frontend component coverage beyond the current mutation payload unit tests and critical auth/chat/action integration tests.
- Review React rendering and bundle performance.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
