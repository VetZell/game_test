# Current Task

## Task ID
TASK-016

## Status
READY

## Priority
High

## Title
Найти и устранить причину сетевого отказа Frontend → Backend в Telegram Mini App

## Goal
Установить и устранить реальную production-причину, по которой игровые действия в Telegram Mini App, включая `Выпить кофе`, завершаются сообщением `Не удалось подключиться к серверу.`, несмотря на успешный деплой frontend и backend. Исправление должно обеспечить фактическое прохождение action request от production frontend до backend и корректное применение серверного ответа.

## Context
- PR #13 с обработкой action-ошибок слит и backend успешно задеплоен.
- PR #14 с исправлением Rollup musl build слит, актуальный frontend успешно собран и задеплоен.
- Новый frontend уже показывает безопасное сообщение `Не удалось подключиться к серверу.` и кнопку `Повторить`, поэтому TASK-014 подтверждена.
- При выполнении действия запрос всё ещё завершается на уровне network/fetch failure либо блокируется до получения HTTP response.
- Нельзя ограничиваться дальнейшим изменением текста ошибки: требуется доказанная диагностика production connectivity.

## Instructions
1. Начать работу от актуального `main` после merge PR #14.
2. Выполнить обязательную startup-синхронизацию и чтение файлов согласно `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-016.
4. Провести аудит полного production action path:
   - `frontend/src/App.tsx` и все API/fetch helpers;
   - выбор и нормализация API base URL;
   - `VITE_API_URL` и fallback behavior;
   - итоговый URL и endpoint action mutation;
   - `frontend/Dockerfile`, `frontend/railway.json`, root/build configuration;
   - backend CORS configuration;
   - backend route `/api/v1/actions` и `/health`;
   - Railway public backend URL, задокументированный или используемый в коде.
5. Точно установить, какой URL попадает в production bundle. Не предполагать значение `VITE_API_URL`: подтвердить это анализом build-time config, generated bundle или воспроизводимым тестом.
6. Проверить типовые причины сетевого отказа:
   - неправильный или устаревший backend hostname;
   - отсутствие build-time `VITE_API_URL`;
   - неверный path/двойной slash;
   - CORS preflight/allowed origins/headers/methods;
   - HTTPS/mixed-content;
   - redirect, DNS или TLS failure;
   - backend bind/health/public-domain mismatch;
   - Telegram iOS WebView behavior;
   - request timeout/abort.
7. Различить network rejection и HTTP error. Если сервер отвечает HTTP status, frontend не должен классифицировать это как отсутствие соединения.
8. Добавить безопасную структурированную диагностику action request минимум с:
   - origin frontend;
   - безопасным API base URL и endpoint без query/secrets;
   - request method;
   - elapsed time;
   - HTTP status, если получен;
   - error name/message/category;
   - без `init_data`, токенов, cookies и других секретов.
9. Не добавлять пользователю debug URL, stack trace или секреты. Диагностика предназначена только для developer console/logging.
10. Исправить подтверждённую причину минимальным устойчивым способом:
    - использовать существующий Vite/environment pattern;
    - не хардкодить временный tunnel;
    - не добавлять секреты в репозиторий;
    - сохранить безопасный development fallback;
    - при необходимости нормализовать URL централизованно.
11. Если проблема требует Railway variable/config change, добавить versioned repository config или точную документацию с обязательным именем/значением переменной. Не заявлять, что внешняя Railway variable изменена, если Codex не имеет доступа подтвердить это.
12. Добавить frontend tests минимум для:
    - production API URL selection;
    - корректного action endpoint;
    - URL normalization;
    - network rejection;
    - HTTP 401/409/422/500 не классифицируются как network failure;
    - retry использует тот же корректный API base URL.
13. Добавить backend tests для CORS/preflight action endpoint, если аудит показывает, что CORS релевантен или меняется.
14. Не менять игровую экономику, action effects, Telegram identity/auth semantics, DB schema, day progression, personality/memory или UI вне необходимой диагностики.
15. Проверить все mutation flows, использующие тот же API base URL: auth/bootstrap, chat, action и day advance. Исправление не должно починить только `coffee`, оставив другие запросы на неправильном host.
16. Обновить `README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md` только по фактически выполненным изменениям.
17. Полностью заменить `docs/REPORT.md` отчётом TASK-016. Отчёт обязан содержать:
    - точную найденную причину;
    - доказательство причины;
    - фактический production URL/path до и после исправления;
    - почему запрос теперь может дойти до backend;
    - какие ограничения production-проверки остаются.
18. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
19. Merge и production deploy не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- `cd frontend && rm -rf node_modules dist && npm ci`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`
- проверить generated production bundle на ожидаемый API hostname/path без секретов
- `cd backend && pytest -q`
- `cd backend && python -m compileall .`
- `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- `cd backend && alembic heads`
- если публичный backend URL доступен без секретов — проверить `GET /health` и зафиксировать HTTP status; не выполнять реальное игровое действие с пользовательскими данными

Если production Railway variables или Telegram WebView недоступны в среде Codex, точно указать это в `docs/REPORT.md`. Не заявлять о полном production исправлении только на основании unit tests; доказать repository/config root cause максимально доступными средствами.

## Acceptance Criteria
- Точная причина network/fetch failure установлена и зафиксирована доказательствами.
- Production frontend формирует правильный HTTPS backend base URL и action endpoint.
- `VITE_API_URL`/fallback behavior детерминированы и покрыты тестами.
- CORS/preflight корректны для production frontend origin, если запрос cross-origin.
- HTTP ошибки не отображаются как отсутствие соединения.
- Все frontend mutation flows используют единый исправленный API base URL.
- Action request может фактически дойти до backend после нового production build/deploy.
- Пользовательское состояние не изменяется при неподтверждённом запросе; retry продолжает работать.
- Секреты и Telegram `init_data` не попадают в логи или bundle.
- Frontend tests/build и backend tests проходят.
- Документация соответствует фактическому исправлению и внешним Railway requirements.
- Создан отдельный PR в `main`.
- После завершения статус задачи установлен в `DONE`.

## Restrictions
- Не ограничиваться изменением пользовательского сообщения об ошибке.
- Не хардкодить временные URL, tunnel domain, токены или секреты.
- Не логировать Telegram `init_data`, bot token, cookies или authorization data.
- Не выполнять реальные пользовательские action mutations против production.
- Не менять DB schema и Alembic revisions без доказанной необходимости; при такой необходимости остановиться и зафиксировать blocker.
- Не менять игровую экономику и unrelated UI/backend behavior.
- Не добавлять новые внешние сервисы или тяжёлые зависимости.
- Не коммитить `node_modules`, `dist`, coverage, screenshots и другие generated artifacts.
- Не выполнять production deploy и merge.
- Не продолжать работу после установки статуса `DONE`.