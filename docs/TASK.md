# Current Task

## Task ID
TASK-015

## Status
READY

## Priority
High

## Title
Исправить сборку frontend в Railway из-за отсутствующего native Rollup package

## Goal
Устранить падение production-сборки frontend-сервиса Railway с ошибкой `Cannot find module @rollup/rollup-linux-x64-musl`, обеспечить воспроизводимую установку зависимостей в Linux/musl окружении Railway и успешный деплой актуального frontend из `main`.

## Context
Backend после PR #13 успешно задеплоен, но frontend Railway остаётся на старом deployment, потому что новая сборка падает на `npm run build` внутри Rollup native loader. В логах Railway отсутствует optional native package `@rollup/rollup-linux-x64-musl`.

## Instructions
1. Начать работу от актуального `main` после merge PR #13.
2. Выполнить обязательную startup-синхронизацию и чтение файлов согласно `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-015.
4. Провести аудит:
   - `frontend/package.json`;
   - `frontend/package-lock.json`;
   - версии Node, npm, Vite и Rollup;
   - Railway/Nixpacks/Docker конфигурации в репозитории;
   - root directory и build/start commands, зафиксированные в документации или config-файлах.
5. Точно локализовать причину, по которой Linux/musl optional dependency Rollup отсутствует после установки зависимостей.
6. Исправление должно быть репозиторным и воспроизводимым. Не ограничиваться ручным временным `Redeploy` или локальным удалением `node_modules`.
7. Предпочитать минимальный надёжный вариант:
   - корректно пересоздать `frontend/package-lock.json` совместимой версией npm;
   - либо явно зафиксировать необходимый platform package/версию Rollup, если это доказанно требуется;
   - либо добавить корректную Railway/Nixpacks install command через versioned config в репозитории.
8. Не удалять lock-файл из репозитория без веской причины. Production install должен оставаться детерминированным.
9. Не использовать постоянный workaround вида `rm -rf node_modules package-lock.json && npm install` на каждом production deploy, если проблему можно исправить lock-файлом или версионной конфигурацией.
10. Проверить, что Railway frontend root остаётся `frontend` и build command выполняет production build именно этого приложения.
11. При необходимости зафиксировать поддерживаемую версию Node/npm через существующий механизм проекта (`engines`, `.nvmrc`, Nixpacks config или эквивалент), не добавляя лишних систем сборки.
12. Не менять runtime-логику игры, API contracts, backend, Telegram auth, игровую экономику или UI вне минимально необходимого изменения build/config.
13. Добавить короткую проверку/документацию, позволяющую отличить новый frontend deployment от старого без вывода секретов. Не добавлять видимый пользователю debug-баннер.
14. Обновить `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/CHANGELOG.md` и `docs/REPORT.md` только по фактически выполненным изменениям.
15. В `docs/REPORT.md` указать:
   - точную причину сбоя;
   - какие файлы изменены;
   - почему выбранный фикс устойчив для Railway Linux/musl;
   - результаты clean-install и production build.
16. После завершения изменить статус задачи на `DONE`, сделать commit, push и открыть отдельный PR в `main`.
17. Merge и production deploy не выполнять.

## Validation
- `git status --short --branch`
- `git diff --check`
- `cd frontend && rm -rf node_modules dist`
- `cd frontend && npm ci`
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`
- если доступен Docker или совместимый Linux runner — повторить clean install/build в Linux окружении и зафиксировать результат
- проверить, что `package-lock.json` не содержит локальных путей и platform-specific мусора, не предназначенного для production

Если Linux/musl окружение недоступно локально, не заявлять, что Railway build подтверждён. Зафиксировать ограничение и доказать исправление анализом lock-файла, npm dependency tree и доступными clean-install проверками.

## Acceptance Criteria
- `npm ci` выполняется на чистом checkout без ручного удаления `package-lock.json`.
- `npm run build` проходит после clean install.
- Rollup native package для Railway Linux/musl корректно разрешается при production install.
- Railway больше не падает с `Cannot find module @rollup/rollup-linux-x64-musl`.
- Frontend deployment может собрать актуальный `main`, содержащий TASK-014.
- Lock-файл и версия package manager дают воспроизводимую установку.
- Не внесены несвязанные изменения в игровой код или backend.
- Документация и отчёт соответствуют фактическому исправлению.
- Создан отдельный PR в `main`.
- После завершения статус задачи установлен в `DONE`.

## Restrictions
- Не коммитить `frontend/node_modules/`, `dist/`, coverage и другие generated artifacts.
- Не удалять `package-lock.json` как постоянное решение без доказанной необходимости.
- Не добавлять тяжёлый Docker/build stack, если достаточно исправления npm/lock/config.
- Не менять Railway secrets и production variables из кода.
- Не выполнять production deploy и merge.
- Не делать несвязанный frontend/backend рефакторинг.
- Не продолжать работу после установки статуса `DONE`.
