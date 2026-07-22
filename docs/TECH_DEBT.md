# Technical Debt

## High
- Verify whether database schema management still relies on runtime `create_all()` and introduce Alembic if required.

## Medium
- Verify production CORS restrictions.
- Verify idempotency for economy-changing requests.
- Verify documentation against the current codebase.

## Low
- Expand end-to-end coverage.
- Review React rendering and bundle performance.

> Codex must add only verified debt and remove entries only when the corresponding problem is demonstrably fixed.
