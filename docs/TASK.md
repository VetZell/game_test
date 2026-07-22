# Current Task

## Task ID
TASK-005

## Status
DONE

## Priority
Medium

## Title
Вынести игровую логику из FastAPI route handlers без изменения поведения

## Goal
Снизить подтверждённый архитектурный долг: отделить основную игровую и экономическую логику `chat` и `actions` от HTTP-обработчиков в `backend/app/main.py`, сохранив существующие API-контракты, значения изменений состояния, транзакционное поведение и ответы приложения.

## Instructions
1. Начать работу от актуального `main` после merge PR #3.
2. Прочитать файлы в порядке, указанном в `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-005.
4. Изучить текущие реализации `POST /api/v1/chat` и `POST /api/v1/actions` в `backend/app/main.py`, связанные схемы, модели, idempotency и тесты.
5. Вынести игровую/экономическую логику из route handlers в один или несколько небольших service-модулей внутри `backend/app/`.
6. Route handlers должны отвечать преимущественно за:
   - получение и валидацию HTTP-входа;
   - Telegram authentication;
   - загрузку необходимых сущностей;
   - вызов service-функций;
   - формирование HTTP-ошибок и ответа.
7. Service-слой должен содержать существующие правила изменения состояния, экономики, памяти и результата действия/чата.
8. Не менять числовые значения начислений, списаний, relationship/stat mutations, тексты ответов, список поддерживаемых действий и формат памяти.
9. Не менять публичные URL, Pydantic-схемы, статус-коды, структуру JSON-ответов, Telegram auth, CORS, idempotency API и схему базы данных.
10. Сохранить существующее транзакционное и idempotency-поведение. Повтор запроса с тем же ключом и payload должен возвращать прежний ответ; конфликт payload должен оставаться HTTP 409.
11. Добавить или расширить автоматические тесты, которые фиксируют текущее поведение вынесенной логики минимум для:
   - одного chat-запроса;
   - каждого поддерживаемого action либо параметризованного набора всех действий;
   - изменений игрока и MarinaState;
   - создаваемых memory/event записей;
   - idempotent replay и same-key/different-payload conflict.
12. Удалять код из `main.py` только после переноса и покрытия тестами. Не выполнять несвязанный рефакторинг.
13. Обновить `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md` и `docs/CHANGELOG.md` только по фактически выполненным изменениям.
14. Полностью заменить `docs/REPORT.md` отчётом TASK-005 согласно протоколу.
15. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
16. Merge не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- `cd backend && pytest -q`
- `cd backend && python -m compileall .`
- `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- `cd backend && alembic heads`
- `cd frontend && npm run build`

Если какая-либо команда не может быть выполнена из-за отсутствия зависимостей или окружения, точно зафиксировать причину в `docs/REPORT.md` и не заявлять об успешной проверке.

## Acceptance Criteria
- Основная игровая логика `chat` и `actions` вынесена из FastAPI route handlers в service-слой.
- `backend/app/main.py` стал заметно проще, а HTTP-обработчики не дублируют правила изменения игрового состояния.
- API-контракты, ответы, статус-коды, экономика, Telegram auth, idempotency и схема БД не изменены.
- Поведение chat/actions закреплено автоматическими тестами, включая replay и conflict для idempotency.
- Все backend-тесты проходят, frontend production build проходит.
- Документация обновлена по фактическому состоянию.
- Создан отдельный PR в `main`.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не добавлять `frontend/node_modules/`, build artifacts и другие generated-файлы.
- Не менять игровой баланс или пользовательские тексты.
- Не менять API и схему базы данных.
- Не выполнять merge.
- Не делать несвязанный рефакторинг.
- Не продолжать работу после установки статуса `DONE`.