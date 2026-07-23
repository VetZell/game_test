# Task
TASK-017 — Исправить production PostgreSQL migration для отсутствующей таблицы `idempotency_records`

## Status
SUCCESS

## Summary
- Audited Alembic configuration, migration graph, SQLAlchemy `IdempotencyRecord` model, idempotency runtime code, backend Docker layouts, Railway config files, migration script and deployment documentation.
- Confirmed a migration already existed in baseline revision `20260722_0001`, and the baseline was the previous Alembic head. The missing production table is therefore not caused by absent model metadata or a missing baseline table definition.
- Identified the likely repository-side cause of the production mismatch: backend API startup intentionally runs only Uvicorn and does not auto-run Alembic, so production required a separate operator migration step after the idempotency schema landed. A database that was already stamped/apparently current at baseline could still be missing `idempotency_records` if that explicit migration step was skipped or the live schema drifted before the table was added.
- Added follow-up Alembic revision `20260723_0002` as the single current head. It safely creates `idempotency_records` when missing and repairs the `request_fingerprint` column, user index and unique key for partially migrated schemas without using runtime `create_all()` or manual SQL.
- Kept the new revision irreversible to avoid deleting production idempotency replay records during downgrade.
- Added regression tests for clean upgrade, existing create_all-style schema upgrade, baseline-stamped missing-table repair, repeated upgrade idempotency, model/schema column parity and action idempotency after an Alembic-created schema.
- Updated Railway/operator documentation with exact migration commands for repository-root and `backend` Root Directory deployments.
- Did not claim the live Railway PostgreSQL database has been migrated; Codex has no production database access. Production still requires an operator to run `alembic upgrade head` against the real backend database.

## Files Changed
- `backend/alembic/versions/20260723_0002_ensure_idempotency_records.py` — new Alembic follow-up revision that ensures `idempotency_records` exists and is the current head.
- `backend/tests/test_alembic_existing_database.py` — added regression coverage for baseline-stamped production-like databases missing `idempotency_records`, repeated upgrade safety and model/schema column parity.
- `backend/tests/test_action_endpoint_regression.py` — added HTTP-level action/idempotency regression using an Alembic-migrated database instead of runtime `Base.metadata.create_all()`.
- `README.md` — added explicit Railway migration commands for repository-root and `backend` Root Directory layouts and documented revision `20260723_0002`.
- `docs/ARCHITECTURE.md` — updated migration/deployment architecture to describe current head `20260723_0002` and production-like missing-table repair.
- `docs/PROJECT_STATE.md` — updated database/migration state and TASK-017 notes.
- `docs/TECH_DEBT.md` — narrowed remaining production debt to the required real Railway/PostgreSQL migration execution and verification.
- `docs/ROADMAP.md` — moved TASK-017 repository-side migration repair into completed work and updated next production step.
- `docs/CHANGELOG.md` — recorded TASK-017.
- `docs/TASK.md` — changed TASK-017 status to `DONE`.
- `docs/REPORT.md` — replaced with this report.

## Problems Found
- Baseline revision `20260722_0001` already included `idempotency_records`, but production logs show `UndefinedTableError`, proving the live database schema did not match the repository migration/model state.
- Backend Docker commands run Uvicorn only; migrations are intentionally not automatic at API startup. This is correct for safety, but it means production must run a separate Alembic command.
- A production database can be baseline-stamped or otherwise treated as current while missing `idempotency_records`; with only baseline as head, `alembic upgrade head` would have no later revision to execute in that drifted state.
- Codex cannot inspect or mutate the real Railway production PostgreSQL database from this repository, so live migration execution remains an operator action.

## Problems Fixed
- Added non-destructive Alembic revision `20260723_0002` after the baseline. It creates `idempotency_records` if missing even when the database is already at baseline revision.
- The revision also ensures `request_fingerprint`, `ix_idempotency_records_user_id` and `uq_idempotency_user_endpoint_key` for partial schemas where the table already exists.
- Alembic graph now has a single head: `20260723_0002`.
- Regression tests prove `alembic upgrade head` creates the idempotency table on clean/existing databases, repairs a baseline-stamped missing-table database, and can be run repeatedly without breaking the schema.
- Action endpoint regression now exercises an Alembic-created database and confirms an idempotent action request/replay returns HTTP 200 rather than failing due to a missing idempotency table.
- Documentation now gives exact Railway operator commands:
  - repository root Root Directory: `cd backend && DATABASE_URL=${{Postgres.DATABASE_URL}} alembic upgrade head`;
  - `backend` Root Directory: `DATABASE_URL=${{Postgres.DATABASE_URL}} alembic upgrade head`;
  - backend image/script alternative: `DATABASE_URL=${{Postgres.DATABASE_URL}} ./scripts/migrate.sh`.

## Tests
- PASS — `git status --short --branch`
- PASS — `git diff --check`
- PASS — `cd backend && alembic heads`
- PASS — `cd backend && DATABASE_URL=sqlite+aiosqlite:////tmp/task017-current.sqlite alembic upgrade head && DATABASE_URL=sqlite+aiosqlite:////tmp/task017-current.sqlite alembic current`
- PASS — `cd backend && pytest -q`
- PASS — `cd backend && python -m compileall .`
- PASS — `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- PASS — `cd backend && pytest -q tests/test_alembic_existing_database.py::test_alembic_upgrade_handles_existing_create_all_schema tests/test_alembic_existing_database.py::test_followup_revision_repairs_database_stamped_at_baseline_without_idempotency_records tests/test_alembic_existing_database.py::test_idempotency_records_schema_matches_model_required_columns tests/test_action_endpoint_regression.py::test_action_endpoint_works_after_alembic_migration_without_runtime_create_all`

## Risks
- Production success is not yet confirmed because Codex does not have access to Railway production PostgreSQL. An operator must run the migration command against the real backend database and verify the table exists.
- The repository test environment used SQLite temporary databases. The migration code is Alembic/SQLAlchemy-based and includes PostgreSQL-safe constraint repair, but a real PostgreSQL staging/production validation remains required before claiming live production resolution.
- Downgrade remains intentionally disabled for baseline/follow-up migration paths to avoid deleting adopted tables, user data or idempotency replay records.

## Technical Debt
- Run `alembic upgrade head` against Railway production PostgreSQL and verify `idempotency_records` exists.
- After production migration, verify idempotent `/api/v1/actions` and `/api/v1/day/advance` requests no longer raise `UndefinedTableError`.

## Safe To Merge
YES

## Commit / PR
- Implementation commit: pending
- Pull Request: pending
