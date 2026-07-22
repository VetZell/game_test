# Current Task

## Task ID
TASK-009

## Status
DONE

## Priority
Medium

## Title
Добавить лёгкую frontend test-инфраструктуру и закрепить idempotency payload behavior

## Goal
Расширить подтверждённое frontend-покрытие без изменения пользовательского поведения: добавить минимальную unit-test инфраструктуру и автоматические тесты для генерации `idempotency_key` и построения mutation payload, чтобы защитить chat/action запросы от регрессий повторной обработки.

## Instructions
1. Начать работу от актуального `main` после merge PR #7.
2. Прочитать файлы в порядке, указанном в `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-009.
4. Проверить текущие `frontend/package.json`, TypeScript/Vite configuration, `frontend/src/mutationPayload.ts` и места использования helper в `frontend/src/App.tsx`.
5. Добавить лёгкую совместимую test-инфраструктуру для frontend. Предпочтительно использовать Vitest без браузерного E2E framework и без тяжёлого UI test stack, если для текущего scope достаточно Node environment.
6. Добавить явную команду `npm test` или `npm run test` в `frontend/package.json`, пригодную для одноразового CI-запуска без watch mode.
7. Добавить unit-тесты минимум для следующих случаев:
   - `createIdempotencyKey()` возвращает непустую строку, совместимую с backend ограничением длины;
   - последовательные новые mutation-запросы получают разные ключи;
   - при доступном `crypto.randomUUID()` используется его результат;
   - fallback работает при недоступном `crypto.randomUUID()` и не раскрывает данные пользователя;
   - `createMutationPayload()` сохраняет исходные поля chat/action payload и добавляет ровно один `idempotency_key`;
   - повторное использование уже построенного payload сохраняет тот же ключ, а новый вызов helper создаёт новый ключ.
8. Тесты не должны зависеть от реального Telegram, сети, Railway, backend или системного времени без контролируемого mock.
9. Не менять backend API, Pydantic schemas, idempotency semantics, Telegram auth, игровой баланс, тексты интерфейса, визуальную часть и схему базы данных.
10. Не выполнять широкий рефакторинг `App.tsx`. Допускаются только минимальные изменения, необходимые для тестируемости, если существующий helper невозможно надёжно проверить без них.
11. Сохранить production build и убедиться, что test dependencies не попадают в runtime dependencies без необходимости.
12. Обновить `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md` и `docs/CHANGELOG.md` только по фактически выполненным изменениям.
13. Полностью заменить `docs/REPORT.md` отчётом TASK-009 согласно протоколу.
14. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
15. Merge не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- `cd frontend && npm install`
- `cd frontend && npm test -- --run` либо эквивалентная одноразовая test-команда, определённая в `package.json`
- `cd frontend && npm run build`
- `cd backend && pytest -q`
- `cd backend && python -m compileall .`
- `cd backend && python -c 'from app.main import app; print(app.title, app.version)'`
- `cd backend && alembic heads`

Если какая-либо команда не может быть выполнена из-за отсутствия зависимостей или окружения, точно зафиксировать причину в `docs/REPORT.md` и не заявлять об успешной проверке.

## Acceptance Criteria
- Во frontend существует лёгкая автоматическая unit-test инфраструктура с одноразовой командой запуска.
- Автоматические тесты закрепляют генерацию уникальных backend-compatible idempotency keys, fallback и построение chat/action mutation payload.
- Тест подтверждает, что повторное использование одного построенного payload не меняет его ключ.
- Frontend production build и все frontend unit tests проходят.
- Все существующие backend-тесты продолжают проходить.
- API, Telegram auth, idempotency semantics, экономика, UI и DB schema не изменены.
- Test dependencies находятся в `devDependencies`, если нет доказанной runtime необходимости.
- Документация соответствует фактическому состоянию.
- Создан отдельный PR в `main`.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не добавлять `frontend/node_modules/`, `dist/`, coverage artifacts и другие generated-файлы.
- Не добавлять Playwright, Cypress или browser E2E framework в рамках этой задачи.
- Не обращаться к реальной сети или Telegram из тестов.
- Не менять backend или игровой баланс.
- Не менять пользовательские тексты и визуальную часть.
- Не выполнять merge.
- Не делать несвязанный рефакторинг.
- Не продолжать работу после установки статуса `DONE`.
