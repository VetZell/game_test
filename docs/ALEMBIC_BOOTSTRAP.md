# Alembic Bootstrap for Existing Databases

## Purpose
TASK-002 verifies the migration path for deployments that already created the current schema with the previous FastAPI `Base.metadata.create_all()` startup behavior.

## New deployments
For an empty database, run:

```bash
cd backend
DATABASE_URL=<production database url> alembic upgrade head
```

The baseline revision `20260722_0001` creates the current tables and records the Alembic version.

## Existing deployments created by `create_all()`
For a database that already contains `users`, `marina_states`, and `marina_memories`, run the same command:

```bash
cd backend
DATABASE_URL=<production database url> alembic upgrade head
```

The baseline migration checks whether current tables already exist before creating them, creates missing idempotency infrastructure, adds the `request_fingerprint` column when needed, and then records revision `20260722_0001` in `alembic_version`.

## Manual verification checklist
Before production rollout:

1. Back up the database.
2. Run the command against a staging or production-like PostgreSQL copy.
3. Confirm `alembic_version.version_num` is `20260722_0001`.
4. Confirm `idempotency_records` exists with `request_fingerprint`, `response`, `user_id`, `endpoint`, and `key` columns.
5. Confirm application startup no longer creates schema implicitly.

If the production schema has drifted from the SQLAlchemy models, stop and reconcile the schema before running migrations.
