# Technical Debt

## High
- Run the Alembic baseline against a staging/production-like PostgreSQL database copy before production rollout; SQLite coverage verifies the existing-schema path, but PostgreSQL rollout still needs environment-specific validation.

## Medium
- Decide whether optional idempotency keys should become mandatory for economy-changing production clients after frontend/client coordination.
- Verify documentation against the current codebase.

## Low
- Expand end-to-end coverage.
- Review React rendering and bundle performance.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
