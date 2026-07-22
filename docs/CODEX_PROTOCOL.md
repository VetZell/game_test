# Codex Workflow Protocol

## Purpose
Этот протокол связывает ChatGPT, пользователя и Codex через файлы GitHub.

## Roles
- **ChatGPT**: анализирует проект и записывает следующую задачу в `docs/TASK.md`.
- **Codex**: читает задачу, выполняет её, тестирует изменения и записывает результат в `docs/REPORT.md`.
- **Пользователь**: запускает Codex короткой командой и принимает решение о merge.

## Required reading order
Перед каждой задачей Codex обязан прочитать:
1. `AGENTS.md`
2. `docs/CODEX_PROTOCOL.md`
3. `docs/PROJECT_STATE.md`
4. `docs/TECH_DEBT.md`
5. `docs/TASK.md`

## Task execution rules
1. Выполнять задачу только когда в `docs/TASK.md` указано `Status: READY`.
2. Использовать последнюю версию `docs/TASK.md` как единственный источник истины.
3. Не расширять объём задачи без необходимости.
4. Не удалять работающий функционал.
5. Не менять API, игровой баланс или архитектуру вне требований задачи.
6. Не выполнять merge автоматически.
7. Работать в отдельной ветке, если интерфейс Codex позволяет создать PR.

## Required completion steps
После выполнения Codex обязан:
1. Запустить проверки из раздела `Validation` задачи.
2. Полностью заменить содержимое `docs/REPORT.md` актуальным отчётом.
3. Обновить `docs/PROJECT_STATE.md`, если состояние проекта изменилось.
4. Обновить `docs/TECH_DEBT.md`, если появился или устранён технический долг.
5. Обновить `docs/ROADMAP.md`, если завершён этап.
6. Добавить запись в `docs/CHANGELOG.md` для значимого изменения.
7. Сделать commit и, когда доступно, открыть Pull Request.
8. Указать реальный commit SHA и ссылку/номер PR в отчёте. Не писать «PR подготовлен», если он фактически не создан.

## Report requirements
`docs/REPORT.md` должен содержать:
- Task
- Status: SUCCESS, PARTIAL или FAILED
- Summary
- Files Changed
- Problems Found
- Problems Fixed
- Tests с точными командами и результатами
- Risks
- Technical Debt
- Safe To Merge: YES или NO
- Commit / PR

## Failure handling
Если операция невозможна из-за доступа, сети, зависимостей или неоднозначности:
- не имитировать успех;
- остановить опасные действия;
- записать точную ошибку и выполненные шаги в `docs/REPORT.md`;
- установить `Safe To Merge: NO`.

## End state
После успешного завершения Codex меняет статус в `docs/TASK.md` с `READY` на `DONE`, не стирая формулировку задачи.
