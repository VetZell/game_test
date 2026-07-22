# Current Task

## Task ID
TASK-008

## Status
READY

## Priority
High

## Title
Подготовить безопасный Alembic workflow для backend Docker/Railway deployment

## Goal
Устранить подтверждённый deployment-долг: backend runtime image должен содержать Alembic-конфигурацию и migration scripts, а проект должен иметь явный, проверяемый способ выполнить `alembic upgrade head` перед production rollout без скрытого автоматического изменения схемы при обычном запуске API.

## Instructions
1. Начать работу от актуального `main` после merge PR #6.
2. Прочитать файлы в порядке, указанном в `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-008.
4. Проверить оба backend deployment layout:
   - root `Dockerfile` и `railway.json`;
   - `backend/Dockerfile` и `backend/railway.json` при Railway Root Directory=`backend`.
5. Проверить, какие Alembic assets реально попадают в каждый runtime image: `alembic.ini`, каталог `alembic/`, migration revisions и необходимые Python modules.
6. Исправить Docker build contexts/COPY-инструкции так, чтобы поддерживаемый backend image мог выполнить `alembic upgrade head` с заданным `DATABASE_URL`.
7. Добавить один явный и документированный migration command/entrypoint для deployment-оператора. Допустимые минимальные варианты:
   - отдельный shell script внутри backend;
   - documented Railway pre-deploy command;
   - отдельная команда контейнера, использующая тот же image.
8. Обычный API startup не должен автоматически запускать миграции в рамках этой задачи. Не объединять `alembic upgrade head` и `uvicorn` в небезопасную startup-цепочку без отдельного доказанного требования.
9. Migration command обязан:
   - завершаться с ненулевым кодом при отсутствии/ошибке `DATABASE_URL` или migration failure;
   - не скрывать ошибки Alembic;
   - не выполнять downgrade;
   - не печатать полный `DATABASE_URL` или секреты.
10. Не менять Alembic baseline revision, ORM-модели, схему базы данных, API, Telegram auth, idempotency, игровой баланс и frontend behavior.
11. Добавить автоматические тесты или лёгкие статические проверки, подтверждающие минимум:
   - необходимые Alembic assets включены в поддерживаемый Docker image layout;
   - migration command вызывает только `alembic upgrade head` и корректно передаёт exit code;
   - обычная API startup command остаётся отдельной и не запускает миграции скрыто.
12. Если Docker CLI доступен, собрать релевантный backend image и проверить наличие Alembic файлов/команды внутри контейнера. Если Docker недоступен, зафиксировать это и выполнить максимально эквивалентные статические/локальные проверки без заявления о container runtime validation.
13. Обновить `README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md` и `docs/CHANGELOG.md` только по фактически выполненным изменениям.
14. В документации чётко разделить:
   - build/deploy API;
   - выполнение migrations;
   - проверку `/health` после rollout;
   - откат application image без destructive database downgrade.
15. Полностью заменить `docs/REPORT.md` отчётом TASK-008 согласно протоколу.
16. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
17. Merge не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- `cd backend && pytest -q`
- `cd backend && python -m compileall .`
- `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- `cd backend && alembic heads`
- `cd backend && alembic history --verbose`
- `cd frontend && npm run build`
- Запустить добавленные проверки deployment/migration workflow.
- При наличии Docker CLI собрать и проверить backend image; точные команды и результаты указать в отчёте.

Если какая-либо команда не может быть выполнена из-за отсутствия зависимостей или окружения, точно зафиксировать причину в `docs/REPORT.md` и не заявлять об успешной проверке.

## Acceptance Criteria
- Поддерживаемый backend Docker image включает `alembic.ini`, migrations и все файлы, необходимые для `alembic upgrade head`.
- Существует явная migration command, которую можно запускать отдельно от API startup.
- Migration command корректно завершается ошибкой при migration failure и не скрывает вывод/exit code Alembic.
- Обычный запуск API не выполняет миграции автоматически.
- Alembic baseline, DB schema, API и игровое поведение не изменены.
- Backend-тесты и frontend production build проходят.
- Deployment/migration workflow закреплён тестами или проверяемыми статическими проверками.
- Документация содержит точный порядок migration → deploy/start → health check и безопасные границы rollback.
- Создан отдельный PR в `main`.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не добавлять `frontend/node_modules/`, `dist/`, Docker build artifacts и другие generated-файлы.
- Не хранить и не печатать секреты или полный `DATABASE_URL`.
- Не запускать destructive downgrade.
- Не менять migration revision и схему БД.
- Не добавлять скрытый auto-migrate в API startup.
- Не выполнять production deploy или реальные production migrations.
- Не выполнять merge.
- Не делать несвязанный рефакторинг.
- Не продолжать работу после установки статуса `DONE`.