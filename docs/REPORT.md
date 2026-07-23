# Task
TASK-015 — Исправить сборку frontend в Railway из-за отсутствующего native Rollup package

## Status
SUCCESS

## Summary
- Audited `frontend/package.json`, `frontend/package-lock.json`, local Node/npm versions, Vite/Rollup versions, Dockerfiles and Railway JSON configuration.
- Found the exact repository-side cause: Rollup `4.62.2` declares `@rollup/rollup-linux-x64-musl` as a platform optional dependency, but the committed lockfile did not contain the `node_modules/@rollup/rollup-linux-x64-musl` package entry, so a deterministic install from the lockfile in Railway Alpine/Linux musl could omit the native loader required by Rollup.
- Added `@rollup/rollup-linux-x64-musl@4.62.2` as a locked optional frontend dependency and regenerated the lock metadata while keeping `package-lock.json` committed and deterministic.
- Added frontend `engines` constraints for supported Node/npm versions and changed the frontend Docker build stage from `npm install` to `npm ci --include=dev --include=optional` so Railway uses the lockfile and installs optional native packages needed for the production build.
- Documented the frontend Railway root/build expectations and a short post-deploy check that distinguishes the new deployment without adding a debug banner.

## Files Changed
- `frontend/package.json` — added Rollup Linux x64 musl optional dependency and Node/npm engine constraints.
- `frontend/package-lock.json` — added the root optional dependency metadata and the locked `@rollup/rollup-linux-x64-musl@4.62.2` package entry with registry integrity.
- `frontend/Dockerfile` — changed build-stage dependency installation to deterministic `npm ci --include=dev --include=optional`.
- `README.md` — documented frontend Railway root/build command expectations and safe post-deploy verification.
- `docs/PROJECT_STATE.md` — recorded the deterministic frontend build and Rollup musl package state.
- `docs/TECH_DEBT.md` — recorded the remaining real Railway deployment verification debt because Docker/Railway runtime is unavailable in this container.
- `docs/ROADMAP.md` and `docs/CHANGELOG.md` — recorded TASK-015 as completed/reported.
- `docs/TASK.md` and `docs/REPORT.md` — updated task status and this report.

## Problems Found
- The frontend lockfile included Rollup and the Linux x64 GNU optional package entry, but did not include `node_modules/@rollup/rollup-linux-x64-musl` even though Rollup lists it in `optionalDependencies`.
- `frontend/Dockerfile` used `npm install`, which can update or reinterpret dependency resolution during image build instead of strictly verifying the committed lockfile.
- The frontend package did not declare the supported Node/npm range used by current Vite/jsdom/Railway Node images.
- Docker is not installed in this execution container, so an actual Alpine/musl image build could not be executed locally.

## Problems Fixed
- The Rollup musl native package is now explicitly present in `package.json` and `package-lock.json`, with version `4.62.2` matching the resolved Rollup version.
- Railway frontend Docker builds now run `npm ci --include=dev --include=optional`, preserving deterministic lockfile installation while ensuring build-time dev dependencies and optional native packages are included.
- The supported Node/npm range is recorded in `frontend/package.json` and the lockfile.
- Documentation now states the frontend Railway root is `frontend`, the build uses `frontend/Dockerfile`, and deployment can be checked via existing TASK-014 behavior/footer version rather than a debug banner.

## Tests
- PASS — `git status --short --branch`
- PASS — `git diff --check`
- PASS — `cd frontend && rm -rf node_modules dist`
- PASS — `cd frontend && npm ci`
- PASS — `cd frontend && npm ls rollup @rollup/rollup-linux-x64-musl --all`
- PASS — `cd frontend && npm test -- --run`
- PASS — `cd frontend && npm run build`
- PASS — `python3 - <<'PY' ... package-lock Rollup musl/local-path audit ... PY`
- WARNING — `docker --version` failed because Docker CLI is not installed in this container; Alpine/musl container build was not executed locally.

## Risks
- The fix is repository-level and deterministic, but the final proof that Railway no longer emits `Cannot find module @rollup/rollup-linux-x64-musl` requires an actual Railway frontend deployment after this PR is merged.
- `@rollup/rollup-linux-x64-musl` is intentionally platform-specific; it is locked because the target failing build environment is Railway's Linux/musl frontend image.

## Technical Debt
- Verify the TASK-015 fix in the real Railway frontend service after merge because Docker/Railway runtime validation is unavailable in this container.
- Existing PostgreSQL staging/production-like Alembic validation debt remains unchanged.

## Safe To Merge
YES

## Commit / PR
- Implementation commit: 061504fd492280e7d2bfe193ce865ae0aff223cf
- Pull Request: https://github.com/VetZell/game_test/pull/14
