# Current Task

## Task ID
TASK-019

## Status
DONE

## Priority
High

## Title
Исправить Railway production deploy: привязать frontend и backend к `main` и включить автоматический деплой после merge

## Goal
Устранить ситуацию, при которой production-сервисы Railway остаются подключены к временной task-ветке и после слияния PR в `main` не получают новое обновление автоматически. Production frontend и backend должны отслеживать только `main`, а успешный merge в `main` должен автоматически запускать соответствующий deployment без ручного выбора очередной task-ветки.

## Context
- TASK-018/PR #17 готовится к merge.
- На скриншоте Railway production frontend подключён к ветке `task-017-production-idempotency-migration`, а в списке вручную выбираются следующие task-ветки.
- Из-за такой настройки merge PR в `main` не приводит к автоматическому production deployment.
- Временные ветки `task-*` предназначены только для разработки и PR, а не как постоянный production source branch.
- Репозиторий может содержать Railway config и deployment documentation, но фактическая branch connection/automatic deployment setting может находиться только в Railway UI и потребовать отдельного действия оператора.

## Instructions
1. Выполнить обязательную startup-синхронизацию и чтение файлов согласно `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
2. Начать работу от актуального `main` после merge TASK-018/PR #17.
3. Создать отдельную ветку для TASK-019.
4. Провести аудит всех deployment-настроек репозитория:
   - root `railway.json` / `railway.toml`, если существуют;
   - `frontend/railway.json` / `frontend/railway.toml`;
   - `backend/railway.json` / `backend/railway.toml`;
   - Dockerfiles;
   - build/start commands;
   - README и deployment-разделы документов;
   - GitHub Actions/workflows, если они участвуют в deploy.
5. Установить и задокументировать точную причину ручного выбора ветки:
   - production Railway service connected to a `task-*` branch instead of `main`;
   - automatic deployment trigger disabled or waiting for CI;
   - либо другая подтверждённая причина.
6. Не утверждать, что Railway UI изменён, если Codex не имеет доступа к Railway project settings.
7. Подготовить корректную production configuration policy:
   - frontend production service source branch: `main`;
   - backend production service source branch: `main`;
   - automatic deploy on new commit to `main`: enabled;
   - временные `task-*` branches не должны быть production source;
   - PR branches могут использоваться только для preview environments, если это явно настроено отдельно.
8. Проверить, не мешают ли автодеплою repository config или workflow settings:
   - неверный root directory;
   - branch-specific build config;
   - disabled deploy trigger;
   - `Wait for CI` при отсутствии/неуспешном required workflow;
   - несовпадение frontend/backend service paths;
   - manual-only deployment configuration.
9. Если проблема исправляется кодом/config-файлами репозитория — внести минимально необходимые изменения.
10. Если проблема находится только в Railway UI — не пытаться имитировать исправление кодом. Вместо этого добавить точную operator instruction для обоих production-сервисов:
    - открыть service → Settings/Source;
    - изменить connected branch на `main`;
    - включить automatic deployment trigger;
    - при наличии `Wait for CI` либо подтвердить рабочий required workflow, либо отключить ожидание до появления CI;
    - сохранить настройки;
    - один раз запустить deployment последнего commit `main`;
    - проверить, что следующий merge в `main` создаёт deployment автоматически.
11. Добавить безопасную проверку/guardrail в документацию или workflow, чтобы production не оставался на `task-*` ветке незаметно. Допустимые варианты:
    - deployment checklist;
    - documented source-branch invariant;
    - CI/check script, проверяющий repository-side assumptions, если Railway branch metadata недоступна;
    - release checklist с обязательной проверкой branch=`main`.
12. Не добавлять Railway API tokens, project IDs, environment secrets или другие credentials в репозиторий.
13. Не менять gameplay, frontend UI, backend API, economy, database schema, Telegram auth, CORS или personality logic.
14. Обновить только релевантные документы:
    - `README.md`;
    - `docs/ARCHITECTURE.md`;
    - `docs/PROJECT_STATE.md`;
    - `docs/ROADMAP.md`;
    - `docs/TECH_DEBT.md`;
    - `docs/CHANGELOG.md`;
    - `docs/REPORT.md`.
15. В `docs/REPORT.md` указать:
    - подтверждённую причину отсутствия автоматического deploy после merge;
    - какие repository configs проверены;
    - какие файлы изменены;
    - какие действия выполнены кодом;
    - какие действия должен выполнить оператор в Railway UI;
    - как проверить первый и следующий автоматический deploy;
    - ограничения доступа Codex к Railway settings.
16. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
17. Merge и изменение production Railway settings от имени пользователя не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- проверить все Railway config files и service root/build/start expectations
- проверить GitHub workflows, связанные с frontend/backend build or deploy
- подтвердить, что repository documentation однозначно требует production source branch `main`
- подтвердить отсутствие секретов и branch-specific task names в production config
- выполнить существующие frontend/backend tests только если изменены runtime/build config files

## Production Verification
После merge TASK-019 оператор должен проверить в Railway для frontend и backend:
1. Connected branch = `main`.
2. Automatic deployments enabled.
3. `Wait for CI` не блокирует deployment без рабочего required workflow.
4. Последний commit `main` задеплоен в production.
5. Следующий тестовый merge в `main` автоматически создаёт deployment без ручного выбора ветки.
6. Frontend и backend deployment используют один и тот же актуальный `main` commit или ожидаемую пару commit/deployment revisions.

## Acceptance Criteria
- Причина ручного выбора task-ветки подтверждена и задокументирована.
- Production policy для обоих Railway services закреплена: source branch только `main`.
- Repository deployment config не содержит привязки к `task-*` веткам.
- Точная инструкция изменения Railway UI подготовлена, если Codex не может изменить настройку напрямую.
- Automatic deployment after merge в `main` имеет однозначный verification procedure.
- Не внесены несвязанные runtime/gameplay изменения.
- Не добавлены секреты.
- Создан отдельный PR в `main`.
- После завершения статус задачи установлен в `DONE`.

## Restrictions
- Не подключать production к `task-*` branch.
- Не деплоить PR branch как production workaround.
- Не хранить Railway tokens/project IDs/secrets в GitHub.
- Не заявлять об изменении Railway UI без фактического доступа и подтверждения.
- Не менять frontend/backend runtime behavior без доказанной необходимости.
- Не выполнять merge и production deploy.
- Не продолжать работу после установки статуса `DONE`.