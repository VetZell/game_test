# Current Task

## Task ID
TASK-007

## Status
DONE

## Priority
High

## Title
Защитить или удалить неаутентифицированные player helper endpoints

## Goal
Устранить подтверждённый риск production exposure для `POST /api/v1/players` и `GET /api/v1/players/{telegram_id}`: определить их реальное использование и привести доступ к безопасной модели, не ломая Telegram-authenticated игровые потоки, frontend и существующие данные.

## Instructions
1. Начать работу от актуального `main` после merge PR #5.
2. Прочитать файлы в порядке, указанном в `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-007.
4. Проверить фактическое использование `POST /api/v1/players` и `GET /api/v1/players/{telegram_id}`:
   - frontend и Telegram Mini App flow;
   - backend internal calls;
   - тесты, документацию и deployment assumptions.
5. Подтвердить, нужны ли эти маршруты production-клиенту. Не сохранять публичный unauthenticated доступ только ради обратной совместимости, если фактических потребителей нет.
6. Выбрать минимально рискованный вариант:
   - удалить маршруты, если они не используются;
   - либо защитить их проверкой Telegram `init_data` и гарантировать, что пользователь может читать/создавать только собственную запись;
   - либо явно ограничить их development/test окружением, если они действительно нужны только как внутренние helper endpoints.
7. Запрещено доверять произвольному `telegram_id` из URL/body без подтверждённой Telegram identity.
8. Сохранить без изменений рабочий flow `POST /api/v1/auth/telegram`, `POST /api/v1/chat` и `POST /api/v1/actions`.
9. Не менять игровую экономику, тексты ответов Марины, idempotency semantics, CORS, Alembic baseline и схему базы данных без доказанной необходимости.
10. Добавить HTTP-level автоматические тесты минимум для:
    - запрета неаутентифицированного доступа к бывшим/сохранённым helper endpoints;
    - невозможности получить или создать запись другого Telegram-пользователя;
    - успешного штатного Telegram authentication flow;
    - отсутствия регрессии chat/actions auth.
11. Если маршруты удаляются, тесты должны подтверждать ожидаемый `404` и отсутствие frontend/internal зависимостей от них.
12. Не раскрывать в ошибках данные пользователя, Telegram init data, bot token или внутренние детали подписи.
13. Обновить `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md` и `docs/CHANGELOG.md` только по фактически выполненным изменениям.
14. Полностью заменить `docs/REPORT.md` отчётом TASK-007 согласно протоколу.
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
- `POST /api/v1/players` и `GET /api/v1/players/{telegram_id}` больше не предоставляют публичный доступ к произвольным данным пользователя.
- Клиент не может создать, прочитать или подменить запись другого Telegram-пользователя.
- Основные Telegram-authenticated flows продолжают работать без изменения публичных ответов и игровой логики.
- Security-поведение закреплено HTTP-level тестами.
- Backend-тесты и frontend production build проходят.
- Документация соответствует фактическому состоянию.
- Создан отдельный PR в `main`.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не добавлять `frontend/node_modules/`, `dist/`, build artifacts и другие generated-файлы.
- Не хранить и не логировать `TELEGRAM_BOT_TOKEN` или полный `init_data`.
- Не ослаблять Telegram signature/age validation.
- Не менять схему базы данных и игровой баланс.
- Не выполнять merge.
- Не делать несвязанный рефакторинг.
- Не продолжать работу после установки статуса `DONE`.
