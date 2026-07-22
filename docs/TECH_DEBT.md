# Technical Debt

## High
- Run the Alembic baseline upgrade and irreversible-downgrade failure path against a staging/production-like PostgreSQL database copy before production rollout; SQLite coverage verifies the existing-schema and data-preservation paths, but PostgreSQL rollout still needs environment-specific validation.

## Low
- Expand end-to-end and frontend coverage.
- Review React rendering and bundle performance.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
