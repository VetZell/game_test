# Current Task

## Task ID
TASK-003

## Status
READY

## Priority
High

## Title
Сделать Alembic baseline downgrade безопасным

## Goal
Устранить риск потери данных при `alembic downgrade base` для существующих баз, которые были созданы до внедрения Alembic через прежний runtime `create_all()`.

## Instructions
1. Прочитать последний review-комментарий в PR #2.
2. Проверить текущую реализацию `downgrade()` в `backend/alembic/versions/20260722_0001_baseline.py`.
3. Исключить возможность удаления унаследованных таблиц `users`, `marina_states` и `marina_memories` на существующей pre-Alembic базе.
4. Выбрать наиболее простой и безопасный вариант:
   - предпочтительно сделать baseline migration необратимой и выбрасывать понятную ошибку при попытке downgrade;
   - либо реализовать доказуемо надёжное различение таблиц, созданных самой миграцией, и таблиц, существовавших до неё.
5. Не допускать silent data loss и destructive downgrade для production-like схем.
6. Добавить автоматический тест, подтверждающий, что попытка `alembic downgrade base` не удаляет существующую pre-Alembic схему и пользовательские данные.
7. При необходимости обновить `docs/ALEMBIC_BOOTSTRAP.md`, чтобы явно описать политику downgrade baseline migration.
8. Обновить `docs/REPORT.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md` и `docs/CHANGELOG.md` согласно протоколу.
9. В `docs/REPORT.md` указать фактический commit SHA и PR #2.
10. Отправить новый commit в ту же ветку `task-001-backend-hardening`, чтобы обновился PR #2.
11. Merge не выполнять.

## Validation
- `cd backend && pytest -q`
- `cd backend && python -m compileall .`
- `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- `cd backend && alembic heads`
- `cd backend && alembic history --verbose`
- `git diff --check`

## Acceptance Criteria
- `alembic downgrade base` не может удалить унаследованные таблицы или пользовательские данные.
- Поведение downgrade задокументировано и покрыто автоматическим тестом.
- Все backend-тесты проходят.
- Документация обновлена по фактическому состоянию.
- Изменения отправлены в PR #2.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не добавлять `frontend/node_modules/`.
- Не выполнять merge.
- Не делать несвязанный рефакторинг.
- Не продолжать после `DONE`.
