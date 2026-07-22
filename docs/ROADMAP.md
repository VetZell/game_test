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

## Next
1. Validate Alembic upgrade, explicit migration command, and irreversible-downgrade failure behavior against a PostgreSQL staging/production-like database copy.
2. Expand end-to-end and broader frontend component/integration coverage.
3. Develop Marina personality, memory systems, content, emotions, activities and mini-games.
4. Production readiness and release monitoring.

> Roadmap statuses must be updated only after verification in the repository.
