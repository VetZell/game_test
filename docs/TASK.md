# Current Task

## Task ID
TASK-010

## Status
READY

## Priority
Medium

## Title
Добавить frontend integration-тесты критических Telegram auth, chat и action flows

## Goal
Расширить frontend-покрытие после TASK-009: закрепить на уровне React-приложения критические пользовательские потоки авторизации, чата и действий с полностью замоканными Telegram WebApp API и backend fetch, не меняя UI, API, игровую экономику и production behavior.

## Instructions
1. Начать работу от актуального `main` после merge PR #8.
2. Прочитать файлы в порядке, указанном в `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-010.
4. Проверить текущие `frontend/src/App.tsx`, `frontend/src/main.tsx`, Telegram declarations, Vitest configuration и существующие mutation payload tests.
5. Добавить минимальную совместимую component/integration test-инфраструктуру поверх существующего Vitest. Допускаются `jsdom` и Testing Library как `devDependencies`; не добавлять Playwright/Cypress или browser E2E framework.
6. Тесты должны использовать полностью контролируемые mocks для:
   - `window.Telegram.WebApp` и `initData`;
   - `fetch`;
   - timers/animations, если они мешают детерминированному тесту;
   - UUID/idempotency key generation при необходимости.
7. Добавить автоматические integration-тесты минимум для следующих сценариев:
   - успешная Telegram auth-загрузка: frontend отправляет `POST /api/v1/auth/telegram` с текущим `init_data` и отображает полученное состояние игрока;
   - ошибка Telegram auth/backend: пользователь видит существующее error state, приложение не падает;
   - отправка chat-сообщения: запрос идёт на `/api/v1/chat`, содержит `init_data`, текст и непустой `idempotency_key`, а успешный ответ отображается в UI;
   - выполнение одного экономически значимого action: запрос идёт на `/api/v1/actions`, содержит action и `idempotency_key`, а обновлённое состояние игрока применяется;
   - pending-защита: повторный быстрый submit того же chat/action не создаёт параллельные дублирующие запросы, если текущий UI уже заявляет такую блокировку;
   - HTTP error chat/action корректно снимает busy state и показывает существующую ошибку без изменения локального состояния на ложный success.
8. Не привязывать тесты к декоративным CSS-классам, точным animation timing или длинным snapshot-файлам. Проверять пользовательски значимое поведение, payload и состояние.
9. Если `App.tsx` невозможно тестировать без небольшого выделения API/Telegram adapter, допускается минимальный рефакторинг только для dependency injection/testability при полном сохранении runtime behavior.
10. Не менять backend API, Pydantic schemas, Telegram auth semantics, idempotency semantics, игровой баланс, тексты интерфейса, изображения и схему БД.
11. Не обращаться к реальной сети, Telegram или Railway из тестов.
12. Сохранить существующие mutation payload unit tests и production build.
13. Обновить `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md` и `docs/CHANGELOG.md` только по фактически выполненным изменениям.
14. Полностью заменить `docs/REPORT.md` отчётом TASK-010 согласно протоколу.
15. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
16. Merge не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- `cd frontend && npm install`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`
- `cd backend && pytest -q`
- `cd backend && python -m compileall .`
- `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- `cd backend && alembic heads`

Если какая-либо команда не может быть выполнена из-за отсутствия зависимостей или окружения, точно зафиксировать причину в `docs/REPORT.md` и не заявлять об успешной проверке.

## Acceptance Criteria
- Frontend integration-тесты выполняются одноразовой командой Vitest без реальной сети и Telegram.
- Автоматически покрыты успешная и ошибочная Telegram auth-загрузка.
- Автоматически покрыты chat и action запросы, включая `init_data` и непустые `idempotency_key`.
- Успешные ответы обновляют отображаемое состояние, ошибки не создают ложный success и снимают busy state.
- Проверена существующая защита от параллельного повторного submit либо в отчёте доказано, что такой защиты нет и это записано как отдельный verified debt без скрытого изменения scope.
- Все frontend unit/integration tests и production build проходят.
- Все существующие backend-тесты продолжают проходить.
- API, Telegram auth, idempotency semantics, экономика, UI и DB schema не изменены.
- Новые test dependencies находятся только в `devDependencies`.
- Документация соответствует фактическому состоянию.
- Создан отдельный PR в `main`.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не добавлять `frontend/node_modules/`, `dist/`, coverage artifacts, screenshots и другие generated-файлы.
- Не добавлять Playwright, Cypress и browser E2E framework.
- Не обращаться к реальным backend, Telegram или Railway.
- Не использовать brittle full-page snapshots как основную проверку.
- Не менять игровой баланс, пользовательские тексты или визуальную часть.
- Не выполнять production deploy, реальные migrations или merge.
- Не делать несвязанный рефакторинг.
- Не продолжать работу после установки статуса `DONE`.