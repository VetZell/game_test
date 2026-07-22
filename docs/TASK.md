# Current Task

## Task ID
TASK-002

## Status
DONE

## Priority
High

## Title
Исправления по ревью PR #2

## Goal
Исправить замечания ревью в PR #2 и обновить тот же Pull Request.

## Instructions
1. Прочитать комментарий ревью в PR #2.
2. Исправить безопасный переход на Alembic для новой и уже существующей базы данных.
3. Сделать CORS безопасным по умолчанию: localhost разрешать только при явно заданном development-окружении.
4. Добавить fingerprint запроса к idempotency record. Одинаковый ключ с другим payload должен возвращать 409.
5. Добавить тесты для всех исправлений.
6. Обновить REPORT, PROJECT_STATE, TECH_DEBT и CHANGELOG.
7. В REPORT указать фактический commit SHA и PR #2.
8. Отправить новый commit в ветку `task-001-backend-hardening`.
9. Merge не выполнять.

## Validation
- backend tests
- compileall
- FastAPI import
- Alembic heads/history
- git diff --check

## Acceptance Criteria
- Все замечания ревью исправлены и покрыты тестами.
- REPORT содержит фактические данные.
- Изменения отправлены в PR #2.
- Статус после завершения изменён на DONE.

## Restrictions
- Не добавлять `frontend/node_modules/`.
- Не выполнять merge.
- Не продолжать после DONE.