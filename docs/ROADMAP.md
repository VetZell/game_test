# Project Roadmap

## Completed / Reported
- Frontend Marina visual refactor.
- Backend security hardening: Alembic baseline, production-safe CORS and persisted idempotency support.
- Alembic review hardening: existing-schema transition, request fingerprints and irreversible baseline downgrade.
- File-based ChatGPT ↔ Codex workflow baseline with short commands `выполни` and `слей`.
- TASK-004 repository architecture audit and documentation alignment.

## Next
1. Validate Alembic upgrade and irreversible-downgrade failure behavior against a PostgreSQL staging/production-like database copy.
2. Decide and coordinate frontend rollout of `idempotency_key` for economy-changing requests.
3. Review whether unauthenticated player helper endpoints should be protected, removed, or limited before production exposure.
4. Reduce backend route-handler business logic by moving gameplay/economy logic into service modules without changing API behavior.
5. Expand end-to-end and frontend coverage.
6. Develop Marina personality, memory systems, content, emotions, activities and mini-games.
7. Production readiness and release monitoring.

> Roadmap statuses must be updated only after verification in the repository.
