# Current Task

## Task ID
TASK-012

## Status
READY

## Priority
Medium

## Title
Добавить безопасное развитие дня Марины по периодам

## Goal
Превратить уже существующие поля `MarinaState.day` и `MarinaState.period` в работающий игровой цикл: дать пользователю явное действие перехода к следующему периоду дня, детерминированно менять базовые потребности Марины, сохранять событие в памяти и обновлять интерфейс без изменения схемы базы данных.

## Instructions
1. Начать работу от актуального `main` после merge PR #10.
2. Прочитать файлы в порядке, указанном в `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-012.
4. Проверить текущие `backend/app/main.py`, `backend/app/game_services.py`, `backend/app/models.py`, `backend/app/schemas.py`, idempotency helpers/tests, а также `frontend/src/App.tsx` и существующие frontend integration tests.
5. Использовать существующие поля `MarinaState.day` и `MarinaState.period`; DB schema и Alembic revisions не менять.
6. Реализовать детерминированный порядок периодов:
   - `morning` → `day`;
   - `day` → `evening`;
   - `evening` → `night`;
   - `night` → `morning` с увеличением `day` ровно на 1.
7. Вынести правила перехода периода и изменения состояния в отдельную тестируемую backend-функцию/service. Route handler не должен содержать игровую логику.
8. При каждом переходе детерминированно изменять только подходящие характеристики Марины из существующего набора (`energy`, `hunger`, `mood`, `calm`), соблюдая границы 0–100.
9. Ночной переход в новое утро должен заметно восстанавливать энергию и спокойствие; дневные переходы должны умеренно снижать энергию/сытость. Конкретные константы должны быть небольшими, явно объявленными, документированными и покрытыми тестами.
10. Не изменять `coins`, `crystals`, `love`, `trust`, `attachment`, `romance`, level и action economy при обычном переходе периода.
11. Добавить Telegram-authenticated mutation endpoint `POST /api/v1/day/advance` или эквивалентный REST-путь в текущем API namespace.
12. Request должен принимать `init_data` и опциональный backend-compatible `idempotency_key` по существующему pattern. Не доверять переданному клиентом `telegram_id`.
13. Response должен содержать минимум:
   - короткое пользовательское сообщение о наступившем периоде;
   - обновлённый `player` в существующем формате;
   - новый `day` и `period` напрямую либо через `player.marina` без дублирования, если существующего формата достаточно.
14. Использовать существующую persisted idempotency infrastructure:
   - повтор того же запроса с тем же ключом возвращает сохранённый ответ;
   - не выполняет второй переход;
   - не создаёт вторую memory/event запись;
   - тот же ключ с другим payload/fingerprint возвращает HTTP 409.
15. После успешного фактического перехода сохранить одну `MarinaMemory` с ролью `event`, безопасным коротким описанием нового периода и подходящей emotion. При idempotent replay новую запись не создавать.
16. Добавить во frontend одну понятную кнопку или control `Продолжить день` рядом с текущим отображением дня/времени, не перестраивая весь интерфейс.
17. Frontend-запрос должен использовать `createMutationPayload()` и отправлять `init_data` + новый `idempotency_key` на endpoint перехода периода.
18. Во время pending кнопка должна быть заблокирована, чтобы быстрые повторные нажатия не создавали параллельные запросы.
19. После успеха frontend должен:
   - применить обновлённый `player`;
   - обновить отображаемые день, период, время, характеристики и derived emotion;
   - показать сообщение backend;
   - использовать существующий haptic success, если доступен.
20. После HTTP/network error frontend должен снять busy state, сохранить предыдущее локальное состояние, показать существующий error state и разрешить повторную попытку.
21. Не менять существующие chat/action API contracts, Telegram auth semantics, personality/memory policy и экономику действий.
22. Добавить backend tests минимум для:
   - всех четырёх переходов периода;
   - увеличения дня только при `night` → `morning`;
   - точных state deltas и clamp 0–100;
   - неизменности валюты, отношений и level;
   - одной event-memory на фактический переход;
   - Telegram auth rejection;
   - idempotent replay без второго перехода/памяти;
   - HTTP 409 при конфликте ключа.
23. Добавить/расширить frontend integration tests минимум для:
   - payload endpoint с `init_data` и непустым `idempotency_key`;
   - успешного обновления day/period/stats/message;
   - pending duplicate protection;
   - error recovery без ложного локального перехода.
24. Обновить `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md` и `docs/CHANGELOG.md` только по фактически выполненным изменениям.
25. Полностью заменить `docs/REPORT.md` отчётом TASK-012 согласно протоколу.
26. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
27. Merge не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- `cd backend && pytest -q`
- `cd backend && python -m compileall .`
- `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- `cd backend && alembic heads`
- `cd frontend && npm install`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`

Если какая-либо команда не может быть выполнена из-за отсутствия зависимостей или окружения, точно зафиксировать причину в `docs/REPORT.md` и не заявлять об успешной проверке.

## Acceptance Criteria
- Работает полный цикл `morning → day → evening → night → morning`.
- `day` увеличивается ровно один раз при переходе из ночи в утро.
- Изменения потребностей детерминированы, ограничены диапазоном 0–100 и покрыты тестами.
- Валюта, отношения, уровень и action economy не меняются переходом периода.
- Endpoint защищён Telegram `init_data` и persisted idempotency.
- Replay одного ключа не выполняет второй переход и не создаёт второе событие.
- Frontend предоставляет один понятный control перехода периода с pending/error handling.
- Успешный ответ обновляет день, период, время, показатели, emotion и сообщение без перезагрузки.
- DB schema, Alembic revisions, chat/action contracts и Marina personality policy сохранены.
- Backend tests, frontend tests и production build проходят.
- Документация соответствует фактическому состоянию.
- Создан отдельный PR в `main`.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не менять схему базы данных и Alembic revisions.
- Не принимать `telegram_id` как источник идентичности пользователя.
- Не запускать реальные migrations или production deploy.
- Не менять цены действий, валюту и relationship balance.
- Не выполнять широкий redesign или рефакторинг `App.tsx` вне необходимого scope.
- Не добавлять внешние AI/API/сетевые сервисы и секреты.
- Не добавлять `frontend/node_modules/`, `dist/`, coverage artifacts и другие generated-файлы.
- Не выполнять merge.
- Не делать несвязанный рефакторинг.
- Не продолжать работу после установки статуса `DONE`.