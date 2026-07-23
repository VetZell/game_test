# Current Task

## Task ID
TASK-017

## Status
READY

## Priority
High

## Title
Исправить production PostgreSQL migration для отсутствующей таблицы `idempotency_records`

## Goal
Устранить подтверждённую production-ошибку игровых действий, при которой запросы успешно доходят до backend, но завершаются HTTP 500 из-за отсутствующей в PostgreSQL таблицы `idempotency_records`. Обеспечить корректное применение Alembic migration в production и защиту от повторения такой рассинхронизации схемы.

## Context
- Frontend и backend успешно задеплоены.
- CORS исправлен: preflight `OPTIONS` для action/day endpoints проходит.
- Backend получает запросы из Telegram Mini App.
- Production logs подтверждают ошибку:
  - `UndefinedTableError: relation "idempotency_records" does not exist`.
- Ошибка возникает при обработке idempotent mutation-запросов (`/api/v1/actions`, `/api/v1/day/advance` и других mutation flows).
- Таблицу нельзя создавать вручную SQL-командой: схема должна управляться только Alembic.

## Instructions
1. Выполнить обязательную startup-синхронизацию и чтение файлов согласно `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
2. Начать работу от актуального `main` после merge TASK-016/PR #15.
3. Создать отдельную ветку для TASK-017.
4. Провести аудит migration state:
   - `backend/alembic.ini`;
   - `backend/alembic/env.py`;
   - все файлы `backend/alembic/versions/`;
   - модель `IdempotencyRecord` и таблицу `idempotency_records`;
   - deployment/migration scripts (`scripts/`, Dockerfile, Railway config, README/docs).
5. Точно установить:
   - существует ли migration, создающая `idempotency_records`;
   - входит ли она в текущий Alembic `head`;
   - почему production database оказалась без таблицы;
   - запускались ли migrations автоматически или требовали ручного шага.
6. Если migration отсутствует — создать корректную Alembic revision, которая безопасно создаёт `idempotency_records` со всеми полями, индексами и constraints, соответствующими SQLAlchemy model.
7. Если migration уже существует — не дублировать таблицу. Исправить реальную причину, по которой `alembic upgrade head` не применялся или не включал нужную revision.
8. Не использовать `Base.metadata.create_all()` как production workaround.
9. Не добавлять ручные SQL-команды создания таблицы в runtime startup.
10. Обеспечить безопасный и воспроизводимый migration path для:
    - пустой базы;
    - существующей production-like базы без `idempotency_records`;
    - базы, уже находящейся на актуальном head.
11. Добавить regression tests, которые подтверждают минимум:
    - `alembic upgrade head` создаёт `idempotency_records`;
    - повторный upgrade не ломает схему;
    - таблица соответствует model metadata по обязательным колонкам/ключам;
    - action/idempotency endpoint после migration не падает с `UndefinedTableError`.
12. Проверить существующие migration scripts и deployment docs. При необходимости добавить точную команду для Railway backend:
    - если Root Directory = repository root: `cd backend && alembic upgrade head`;
    - если Root Directory = `backend`: `alembic upgrade head`.
13. Не утверждать, что production migration фактически выполнена, если Codex не имеет доступа к Railway production database. В этом случае подготовить repository fix и точную operator instruction.
14. Не менять игровую экономику, action effects, Telegram auth semantics, CORS, frontend UI или personality/memory logic.
15. Обновить только релевантные документы:
    - `README.md`;
    - `docs/ARCHITECTURE.md`;
    - `docs/PROJECT_STATE.md`;
    - `docs/TECH_DEBT.md`;
    - `docs/ROADMAP.md`;
    - `docs/CHANGELOG.md`;
    - `docs/REPORT.md`.
16. В `docs/REPORT.md` указать:
    - точную причину отсутствия таблицы;
    - существовала ли migration;
    - почему production её не получил;
    - какие файлы изменены;
    - результаты migration tests;
    - какие production-действия ещё требуется выполнить вручную.
17. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
18. Merge и production deploy не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- `cd backend && alembic heads`
- `cd backend && alembic current`
- `cd backend && pytest -q`
- `cd backend && python -m compileall .`
- `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- выполнить migration test на чистой temporary database
- выполнить upgrade test на production-like temporary database без `idempotency_records`
- подтвердить, что после `alembic upgrade head` таблица `idempotency_records` существует
- подтвердить, что повторный `alembic upgrade head` идемпотентен

Если реальный PostgreSQL/Railway недоступен, использовать доступный PostgreSQL-compatible test environment либо честно зафиксировать ограничение. Не заявлять о production успехе без подтверждения.

## Acceptance Criteria
- Причина отсутствия `idempotency_records` установлена и задокументирована.
- Alembic graph содержит корректный единственный head.
- `alembic upgrade head` создаёт требуемую таблицу без ручного SQL.
- Существующая база безопасно обновляется.
- Повторный migration run не вызывает ошибок.
- Action/idempotency flows после migration не падают с `UndefinedTableError`.
- Добавлены regression tests migration/schema behavior.
- Production operator instruction для Railway точна и не содержит секретов.
- Не внесены несвязанные изменения.
- Создан отдельный PR в `main`.
- После завершения статус задачи установлен в `DONE`.

## Restrictions
- Не создавать таблицу вручную в Railway SQL console.
- Не использовать runtime `create_all()` как production fix.
- Не удалять или пересоздавать production data.
- Не выполнять destructive downgrade против production.
- Не коммитить DATABASE_URL, токены, пароли или другие secrets.
- Не выполнять merge и production deploy.
- Не продолжать работу после установки статуса `DONE`.
