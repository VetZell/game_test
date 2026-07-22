# Project Roadmap

## Completed / Reported
- Frontend Marina visual refactor.
- Backend security hardening: Alembic baseline, production-safe CORS and persisted idempotency support.
- Alembic review hardening: existing-schema transition, request fingerprints and irreversible baseline downgrade.
- File-based ChatGPT ↔ Codex workflow baseline with short commands `выполни` and `слей`.
- TASK-004 repository architecture audit and documentation alignment.
- TASK-005 chat/action service-layer extraction without behavior changes.
- TASK-006 frontend idempotency-key rollout for chat/action mutations.

## Next
1. Validate Alembic upgrade and irreversible-downgrade failure behavior against a PostgreSQL staging/production-like database copy.
2. Review whether unauthenticated player helper endpoints should be protected, removed, or limited before production exposure.
3. Expand end-to-end and frontend coverage.
4. Develop Marina personality, memory systems, content, emotions, activities and mini-games.
5. Production readiness and release monitoring.

> Roadmap statuses must be updated only after verification in the repository.
