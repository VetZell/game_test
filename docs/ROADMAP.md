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
- TASK-015 reproducible Railway frontend build fix for Rollup Linux x64 musl optional package resolution.
- TASK-016 production Frontend → Backend connectivity diagnosis: centralized API URL handling, safe action diagnostics and documented/covered CORS preflight requirements.
- TASK-017 production idempotency migration repair: Alembic head now includes a follow-up revision that creates/repairs `idempotency_records` for baseline-stamped production-like databases and documents the required Railway operator migration command.
- TASK-018 compact top status bar: reduced mobile HUD height while preserving day/time/period, day advance, five visible stats, safe-area behavior and frontend coverage.
- TASK-019 Railway main auto deploy policy: audited repository Railway/Docker/GitHub workflow config and documented the production invariant that frontend/backend Railway services must track `main` with automatic deploys enabled.
- TASK-020 mobile layout repair: fixed one-row HUD, mobile stat scrolling, scene overlay grouping and bottom navigation spacing/stacking with responsive validation.

## Next
1. In Railway UI, switch frontend/backend production services to connected branch `main`, enable automatic deploys, verify `Wait for CI`, deploy the latest `main` commit once, and confirm the next merge auto-deploys.
2. Run and verify `alembic upgrade head` against the real Railway production PostgreSQL database, confirming `idempotency_records` exists and idempotent action/day mutations succeed.
3. Expand end-to-end and broader frontend component coverage beyond the current critical integration flows.
4. Expand Marina content, emotions, activities and mini-games on top of the deterministic personality/memory policy.
5. Production readiness and release monitoring.

> Roadmap statuses must be updated only after verification in the repository.

## Completed
- TASK-021 compact no-scroll HUD: removed mobile horizontal stat scrolling and fit time/day/period/day-advance plus all five stats in one visible top row.
