# Technical Debt

## High
- Run the new Alembic baseline against a staging/production-like PostgreSQL database before relying on it for deployment automation.

## Medium
- Decide whether optional idempotency keys should become mandatory for economy-changing production clients after frontend/client coordination.
- Verify documentation against the current codebase.

## Low
- Expand end-to-end coverage.
- Review React rendering and bundle performance.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
