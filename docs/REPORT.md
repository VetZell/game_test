# Task
TASK-019 — Исправить Railway production deploy: привязать frontend и backend к `main` и включить автоматический деплой после merge

## Status
SUCCESS

## Summary
- Audited repository-side Railway deployment configuration, Dockerfiles, build/start commands, GitHub CI workflow, README deployment guidance and project documentation.
- Confirmed the repository config does not contain a production `task-*` branch selector: Railway JSON files define Dockerfile builders, health checks and restart policy only.
- Confirmed the likely production blocker described by the user is Railway service UI/source state: a production service was connected to a temporary `task-*` branch instead of `main`, so merges to `main` cannot automatically trigger that service.
- Did not claim Railway UI was changed; Codex has GitHub/repository access here, not Railway project settings or credentials.
- Added a production source-branch policy and operator checklist: frontend and backend production services must use source branch `main`, automatic deployments must be enabled, and `task-*` branches must be PR/preview-only.
- Added a release guardrail requiring operators to verify `Branch: main`, automatic deploy enabled, no blocking `Wait for CI`, and deployed revision equals the expected latest `main` commit.
- No frontend/backend runtime behavior, gameplay, economy, database schema, Telegram auth, CORS, personality logic, Docker build commands or Railway health checks were changed.

## Files Changed
- `README.md` — added Railway production source branch policy, UI steps, automatic deploy verification and release checklist guardrail.
- `docs/ARCHITECTURE.md` — documented that Railway branch/auto-deploy settings are service UI state, not repository JSON state, and recorded the TASK-019 invariant.
- `docs/PROJECT_STATE.md` — recorded the deployment policy and confirmed repository config audit outcome.
- `docs/TECH_DEBT.md` — added the required Railway UI operator action as unresolved high-priority operational debt.
- `docs/ROADMAP.md` — marked repository-side TASK-019 policy/documentation work completed and moved Railway UI verification to next operator steps.
- `docs/CHANGELOG.md` — added TASK-019 changelog entry.
- `docs/TASK.md` — changed TASK-019 status to `DONE`.
- `docs/REPORT.md` — replaced with this report.

## Repository Configs Audited
- `railway.json` — root backend Dockerfile builder, `/health` check and restart policy; no branch selector, no manual-only flag, no secrets.
- `backend/railway.json` — backend-root Dockerfile builder, `/health` check and restart policy; no branch selector, no manual-only flag, no secrets.
- `frontend/railway.json` — frontend Dockerfile builder, `/` health check and restart policy; no branch selector, no manual-only flag, no secrets.
- `Dockerfile` — root backend image includes Alembic assets/scripts and starts only Uvicorn; no branch-specific behavior.
- `backend/Dockerfile` — backend-root image includes Alembic assets/scripts and starts only Uvicorn; no branch-specific behavior.
- `frontend/Dockerfile` — frontend image uses deterministic npm install/build and serves `dist`; no branch-specific behavior.
- `.github/workflows/ci.yml` — CI runs on push to `main`, pull requests to `main`, and manual dispatch; no deploy job or Railway branch setting is present.
- README/docs deployment sections — updated to make production source branch `main` explicit.

## Problems Found
- The user-provided Railway screenshot/context shows production was connected to a temporary task branch (`task-017-production-idempotency-migration`) rather than `main`.
- Railway connected branch and automatic deploy trigger are service settings outside the repository JSON files audited here.
- If `Wait for CI` is enabled in Railway while no required workflow is configured/green, deployments may remain blocked even after branch is corrected to `main`.
- Previous repository documentation described Docker/root/build/migration expectations, but did not explicitly state the production source-branch invariant or task-branch prohibition.

## Problems Fixed
- Added clear documentation that both production Railway services must use `main` as source branch and have automatic deployments enabled for new commits to `main`.
- Added exact operator UI steps for frontend and backend services: open service settings, set connected branch to `main`, enable automatic deployments, verify/disable blocking `Wait for CI`, save, deploy latest `main`, and verify the next merge auto-deploys.
- Added repository-side guardrail via README release checklist and architecture/project-state documentation.
- Confirmed no repository Railway config contains secrets, Railway project IDs/tokens, or production `task-*` branch pins.

## Operator Actions Still Required In Railway UI
1. For the frontend production service, open **Settings → Source** and set connected branch to `main`.
2. For the backend production service, open **Settings → Source** and set connected branch to `main`.
3. Enable automatic deployments for new commits to `main` on both services.
4. If **Wait for CI** is enabled, verify the GitHub `CI` workflow is the required check and passes on `main`; otherwise disable waiting until a reliable required workflow is configured.
5. Save settings for both services.
6. Trigger one deployment of the latest `main` commit for both services.
7. After the next merge into `main`, confirm Railway creates deployments automatically without manually selecting a task branch.
8. Confirm frontend and backend deployments point to the same expected latest `main` commit or an intentional compatible pair.

## Tests
- PASS — `git status --short --branch`
- PASS — `find . -path './frontend/node_modules' -prune -o -iname 'railway.*' -print`
- PASS — `find . -path './frontend/node_modules' -prune -o -path './.github/workflows/*' -type f -print`
- PASS — `find . -path './frontend/node_modules' -prune -o -name 'Dockerfile' -print`
- PASS — `sed -n '1,180p' railway.json backend/railway.json frontend/railway.json Dockerfile backend/Dockerfile frontend/Dockerfile .github/workflows/ci.yml`
- PASS — `rg -n 'task-|branch|Railway|deploy|deployment|root directory|rootDirectory|startCommand|buildCommand|Dockerfile|Wait for CI|automatic' README.md docs .github railway.* frontend/railway.* backend/railway.* Dockerfile frontend/Dockerfile backend/Dockerfile`
- PASS — repository production config audit: no Railway config or Dockerfile pins production to a `task-*` branch.
- PASS — documentation now explicitly requires Railway production source branch `main` for frontend and backend services.
- PASS — no Railway tokens, project IDs, environment secrets or credentials were added.
- PASS — `git diff --check`

## Risks
- Codex cannot verify or mutate actual Railway service settings without Railway project access/tokens, so the production branch switch and automatic deploy toggle remain operator actions.
- If Railway `Wait for CI` is enabled against a missing/failing required workflow, automatic deploy may still be blocked until Railway settings are corrected.
- This task intentionally did not run a production deploy or change Railway settings on behalf of the user.

## Technical Debt
- Operator must update Railway UI for both frontend and backend production services and verify one immediate latest-`main` deploy plus the next merge-triggered automatic deploy.
- Existing production database migration debt remains separate: run `alembic upgrade head` against real Railway PostgreSQL and verify idempotency tables/mutations.

## Safe To Merge
YES

## Commit / PR
- Implementation commit: 07791e46e4ed64b24851fdc9d50e1605f029f5f6
- Pull Request: pending creation
