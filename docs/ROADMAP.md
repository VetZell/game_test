# Project Roadmap

## Completed / Reported
- Frontend Marina visual refactor.
- Backend security hardening: Alembic baseline, production-safe CORS and persisted idempotency support.
- Alembic review hardening: existing-schema transition, request fingerprints and irreversible baseline downgrade.
- File-based ChatGPT ↔ Codex workflow baseline with short commands `выполни` and `слей`.
- TASK-004 repository architecture audit and documentation alignment.
- TASK-005 chat/action service-layer extraction without behavior changes.
- TASK-006 frontend idempotency-key rollout for chat/action mutations.
- TASK-007 removal of unauthenticated player helper endpoints.
- TASK-008 safe Alembic deployment workflow with Docker image assets and explicit migration command.
- TASK-009 lightweight frontend unit-test infrastructure for idempotency mutation payloads.
- TASK-010 frontend integration tests for critical Telegram auth, chat and action flows.
- TASK-011 deterministic Marina personality and safe memory-response policy for chat replies.
- TASK-012 safe day-period progression with Telegram-authenticated idempotent backend endpoint and frontend control.
- TASK-013 frontend interface polish for emotion/action/day state hierarchy, accessibility, responsive safe-area layout and tests.
- TASK-014 action mutation error recovery and retry behavior for safe user-facing failures.

## Next
1. Validate Alembic upgrade, explicit migration command, and irreversible-downgrade failure behavior against a PostgreSQL staging/production-like database copy.
2. Expand end-to-end and broader frontend component coverage beyond the current critical integration flows.
3. Expand Marina content, emotions, activities and mini-games on top of the deterministic personality/memory policy.
4. Production readiness and release monitoring.

> Roadmap statuses must be updated only after verification in the repository.
