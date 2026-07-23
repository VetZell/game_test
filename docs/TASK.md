# Current Task

## Task ID
TASK-014

## Status
DONE

## Priority
High

## Title
Исправить выполнение игровых действий и понятную обработку ошибок

## Goal
Устранить сбой, из-за которого после нажатия на игровое действие, в первую очередь `Выпить кофе`, интерфейс показывает техническое сообщение `Load failed`, обеспечить корректное выполнение action mutation, безопасное обновление состояния и понятное восстановление после сетевых, auth и backend ошибок.

## Instructions
1. Начать работу от актуального `main` после merge PR #12.
2. Выполнить обязательную startup-синхронизацию и чтение файлов согласно `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-014.
4. Провести аудит текущих:
   - `frontend/src/App.tsx`;
   - frontend API/fetch helpers и mutation payload helpers;
   - `frontend/src/App.integration.test.tsx`;
   - backend route игрового действия;
   - backend action service, schemas, Telegram auth и persisted idempotency;
   - конфигурации frontend API base URL и deployment-related environment usage.
5. Воспроизвести или точно локализовать причину `Load failed` при нажатии `Выпить кофе`. Не маскировать проблему только заменой текста ошибки.
6. Проверить весь путь action mutation:
   - правильный endpoint и HTTP method;
   - корректный API base URL;
   - `init_data` Telegram WebApp;
   - непустой новый `idempotency_key` через существующий helper;
   - JSON request/response contracts;
   - HTTP status handling;
   - network rejection/timeout behavior;
   - применение обновлённого `player` после успеха.
7. Сохранить существующие backend action contracts, Telegram identity semantics, persisted idempotency и игровую экономику, если фактическая причина не требует минимального совместимого исправления.
8. После успешного действия frontend должен без перезагрузки:
   - применить обновлённый `player`;
   - обновить характеристики Марины;
   - обновить backend emotion и соответствующий visual/label;
   - показать пользовательское сообщение action response;
   - снять pending state;
   - выполнить существующий success haptic, если доступен.
9. Во время pending:
   - блокировать повторный запуск того же действия;
   - показывать понятный индикатор процесса на action card;
   - использовать корректные `disabled` и `aria-busy`.
10. При любой ошибке:
   - сохранить предыдущее локальное состояние игрока и Марины;
   - гарантированно снять pending state;
   - разрешить повторную попытку;
   - не показывать пользователю сырой текст `Load failed`, stack trace, HTML или технический response body.
11. Добавить централизованное преобразование ошибок action request в понятные сообщения минимум для:
   - отсутствия соединения/сетевой ошибки: `Не удалось подключиться к серверу.`;
   - HTTP 401/403: `Не удалось подтвердить авторизацию Telegram.`;
   - HTTP 409: понятное сообщение о конфликте/повторе запроса без ложного локального успеха;
   - HTTP 422 или action unavailable: `Действие сейчас выполнить нельзя.`;
   - HTTP 500+: `Сервер временно недоступен. Попробуйте ещё раз.`;
   - неизвестной ошибки: `Не удалось выполнить действие.`
12. Добавить в error panel кнопку `Повторить`, которая повторяет последнее неуспешное действие без перезагрузки страницы.
13. Retry должен:
   - создать новый mutation payload и новый idempotency key для запроса, который не был подтверждён сервером;
   - не запускать параллельные дубли;
   - корректно очищать старую ошибку при новом запуске;
   - после успеха применить серверный ответ один раз.
14. Не выводить чувствительные Telegram `init_data`, bot token или секреты в console logs.
15. Для developer diagnostics использовать структурированный `console.error` минимум с:
   - безопасным endpoint URL/path;
   - HTTP status, если известен;
   - безопасным текстом ответа или error detail;
   - исходным Error/stack, если доступен;
   - без Telegram init data и секретов.
16. Проверить все существующие action cards, а не только `coffee`, чтобы общий request path и error recovery работали одинаково.
17. Не изменять цены, эффекты, награды, relationship balance, day progression, chat personality/memory policy или DB schema.
18. Добавить/обновить frontend integration tests минимум для:
   - успешного действия `coffee` с правильным endpoint, `init_data` и непустым idempotency key;
   - обновления player stats, emotion/visual и сообщения после успеха;
   - network rejection с понятным сообщением вместо `Load failed`;
   - HTTP 401;
   - HTTP 500;
   - pending duplicate protection;
   - снятия pending после ошибки;
   - кнопки `Повторить` и успешного retry;
   - отсутствия ложного локального изменения состояния при ошибке.
19. Добавить или сохранить backend regression tests минимум для:
   - успешного `coffee` action;
   - Telegram auth rejection;
   - persisted idempotent replay;
   - conflict 409 при том же ключе и другом payload;
   - корректного action response contract.
20. Если причина связана с production API URL/configuration, исправить её через существующий Vite/environment pattern, задокументировать обязательную переменную и сохранить безопасный development fallback. Не хардкодить временный tunnel или секретный URL.
21. Обновить `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md` и `docs/CHANGELOG.md` только по фактически выполненным изменениям.
22. Полностью заменить `docs/REPORT.md` отчётом TASK-014 согласно протоколу. В отчёте отдельно указать точную найденную причину пользовательского `Load failed`.
23. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
24. Merge не выполнять.

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
- Нажатие `Выпить кофе` отправляет корректный action request и при успешном backend response обновляет интерфейс без перезагрузки.
- Точная причина прежнего `Load failed` найдена и устранена, а не только скрыта.
- Пользователь больше не видит `Load failed` или другие сырые технические ошибки.
- Network, auth, validation/conflict и server errors отображаются понятными русскими сообщениями.
- После ошибки прежнее состояние сохраняется, pending снимается и действие можно повторить.
- Кнопка `Повторить` корректно повторяет последнее действие без параллельного дубля.
- Success обновляет stats, emotion/visual и message согласованно.
- Telegram init data и секреты не попадают в логи.
- Все action cards используют общий исправленный flow.
- Frontend tests, production build и backend tests проходят.
- Экономика, day progression, chat/personality, auth semantics и DB schema не изменены вне минимального совместимого исправления.
- Документация соответствует фактическому состоянию.
- Создан отдельный PR в `main`.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не ограничиваться косметической заменой текста ошибки без поиска причины.
- Не доверять переданному клиентом `telegram_id`.
- Не логировать Telegram init data, токены и секреты.
- Не хардкодить production/tunnel URL и секреты.
- Не менять игровую экономику, цены и relationship balance.
- Не менять DB schema и Alembic revisions без доказанной необходимости; при такой необходимости остановиться и зафиксировать blocker вместо расширения scope.
- Не добавлять новые внешние сервисы и зависимости без доказанной необходимости.
- Не обращаться к реальной Telegram/Railway сети из автоматических тестов.
- Не добавлять `frontend/node_modules/`, `dist/`, coverage artifacts, screenshots и другие generated-файлы.
- Не выполнять production deploy и merge.
- Не делать несвязанный рефакторинг.
- Не продолжать работу после установки статуса `DONE`.