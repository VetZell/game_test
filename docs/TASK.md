# Current Task

## Task ID
TASK-013

## Status
DONE

## Priority
High

## Title
Завершить интерфейс и оформление эмоций, действий и состояний Марины

## Goal
Довести существующий Telegram Mini App интерфейс до цельного, аккуратного и понятного игрового экрана: унифицировать визуальную иерархию, оформление эмоций, действий, состояния дня, pending/error/success feedback и мобильную адаптацию без изменения backend API, игровой экономики и схемы БД.

## Instructions
1. Начать работу от актуального `main` после merge PR #11.
2. Прочитать файлы в порядке, указанном в `AGENTS.md` и `docs/CODEX_PROTOCOL.md`.
3. Создать отдельную ветку для TASK-013.
4. Провести аудит текущих:
   - `frontend/src/App.tsx`;
   - `frontend/src/index.css`;
   - `frontend/src/App.integration.test.tsx`;
   - `frontend/public/marina/` и доступных emotion/action assets/manifests;
   - Telegram safe-area и viewport behavior.
5. Не менять backend API, схемы запросов/ответов, Telegram auth, idempotency, period progression, personality/memory policy, action economy и DB schema.
6. Сохранить текущий общий художественный стиль: тёмный уютный интерфейс, розово-фиолетовые акценты, стеклянные панели и центральная сцена Марины. Не заменять его на другой визуальный язык.
7. Привести layout к завершённой структуре:
   - компактный верхний HUD с временем, периодом, номером дня и основными характеристиками;
   - центральная сцена с Мариной как главным визуальным фокусом;
   - понятный блок текущего сообщения/эмоции;
   - отдельная зона основных действий;
   - очевидный control `Продолжить день`;
   - чат как отдельный overlay/sheet, не перекрывающий критические controls;
   - нижняя навигация не должна выглядеть активной для неработающих разделов.
8. Удалить или визуально нейтрализовать декоративные/неработающие controls, которые создают ложное ожидание функциональности. Не добавлять новые фиктивные кнопки.
9. Завершить систему эмоций:
   - одна централизованная frontend-конфигурация для emotion key → label → visual → UI tone;
   - поддержать минимум `neutral`, `smile`, `happy`, `love`, `caring`, `sad`, `sleepy`, `surprised`, `thoughtful`, `shy`;
   - backend emotion должен корректно отображаться, а неизвестное значение безопасно переходить в derived/default emotion;
   - подпись эмоции и визуал должны синхронно обновляться после auth, chat, action и day advance;
   - не допускать ситуации, когда текст говорит об одной эмоции, а badge/visual показывает другую из-за stale state.
10. Завершить оформление действий:
   - каждая action card должна иметь ясные название, краткий эффект, стоимость при наличии и distinct visual/icon;
   - pending action должна явно показывать процесс и блокировать повторный запуск;
   - успешное действие должно показывать короткий визуальный feedback без полного layout shift;
   - ошибка не должна оставлять action card в pending state;
   - disabled state должен быть различим визуально и доступен для screen readers.
11. Улучшить `Продолжить день`:
   - показать, к какому периоду ведёт следующий переход;
   - pending/disabled state должен быть заметен;
   - после успеха период, время, день, фон/тон сцены и эмоция должны обновляться согласованно;
   - при ошибке предыдущее состояние и оформление сохраняются.
12. Добавить period-aware оформление сцены без новых backend данных:
   - `morning`, `day`, `evening`, `night` должны отличаться фоном/освещением/акцентами;
   - изменения должны быть CSS/class-based и лёгкими;
   - не использовать тяжёлые video/canvas/WebGL эффекты.
13. Улучшить мобильную адаптацию прежде всего для Telegram WebView/iPhone:
   - корректно учитывать `env(safe-area-inset-top)` и `env(safe-area-inset-bottom)`;
   - исключить горизонтальный overflow страницы;
   - controls не должны перекрываться на ширине 320–430 px;
   - кликабельные элементы должны иметь практичный touch target;
   - чат и нижняя панель должны корректно работать при открытой клавиатуре насколько это возможно стандартными CSS средствами.
14. Улучшить CSS maintainability:
   - отформатировать текущий однострочный `index.css` в читаемую структуру;
   - ввести ограниченный набор CSS custom properties для фона, панелей, текста, акцента, danger/success, radius и spacing;
   - не добавлять CSS framework и не менять build stack.
15. Добавить доступность:
   - `aria-label` для icon-only controls;
   - корректные `disabled` и `aria-busy` для pending controls;
   - видимый `:focus-visible`;
   - достаточный контраст основного текста и ошибок;
   - decorative элементы не должны засорять accessibility tree.
16. Анимации должны быть короткими и функциональными:
   - emotion/visual fade или мягкий transition;
   - action success/pending feedback;
   - period scene transition;
   - соблюдать `prefers-reduced-motion: reduce`.
17. Использовать только уже существующие repository assets. Если для конкретной эмоции нет отдельного изображения, использовать безопасный fallback из текущего набора и зафиксировать это в отчёте. Не генерировать и не скачивать новые изображения в рамках TASK-013.
18. Не менять пользовательские значения характеристик, цены, награды, длительность backend операций или смысл игровых действий.
19. Добавить/обновить frontend tests минимум для:
   - backend emotion → label/visual mapping и неизвестного fallback;
   - синхронного обновления эмоции после chat/action/day advance;
   - pending и disabled состояния action/day controls;
   - error recovery без stale pending state;
   - отсутствия неработающих interactive controls в ключевых областях либо их корректного disabled/non-interactive состояния;
   - основных accessibility attributes.
20. Production build должен проходить без TypeScript ошибок и без новых runtime dependencies, если они не доказанно необходимы. Предпочитать чистые React/CSS изменения.
21. Обновить `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `docs/TECH_DEBT.md`, `docs/ROADMAP.md` и `docs/CHANGELOG.md` только по фактически выполненным изменениям.
22. Полностью заменить `docs/REPORT.md` отчётом TASK-013 согласно протоколу.
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
- Интерфейс имеет завершённую визуальную иерархию на desktop и mobile Telegram WebView.
- HUD, сцена, сообщение/эмоция, действия, переход дня и чат визуально разделены и не конфликтуют.
- Эмоции отображаются через централизованный mapping и синхронно обновляются после всех mutation flows.
- Неизвестная backend emotion безопасно отображается через fallback.
- Action cards имеют понятные effects/costs, pending, disabled, success и error states.
- Периоды суток визуально различаются без тяжёлых эффектов и новых backend данных.
- Неработающие controls удалены либо не выглядят интерактивными.
- Safe areas, small-screen layout и touch targets обработаны.
- Добавлены `aria-label`, `aria-busy`, focus-visible и reduced-motion support.
- Frontend tests и production build проходят.
- Все существующие backend tests продолжают проходить.
- Backend API, экономика, auth, idempotency, personality и DB schema не изменены.
- Документация соответствует фактическому состоянию.
- Создан отдельный PR в `main`.
- После завершения статус задачи изменён на `DONE`.

## Restrictions
- Не менять backend runtime behavior, API contracts, DB schema и Alembic revisions.
- Не менять игровую экономику, цены, награды и relationship balance.
- Не добавлять новые неработающие разделы, кнопки и mock-функции.
- Не скачивать и не генерировать новые изображения.
- Не добавлять тяжёлые UI frameworks, animation libraries, video, canvas или WebGL.
- Не обращаться к реальной сети, Telegram или Railway из тестов.
- Не добавлять `frontend/node_modules/`, `dist/`, coverage artifacts, screenshots и другие generated-файлы.
- Не выполнять production deploy и merge.
- Не делать несвязанный backend-рефакторинг.
- Не продолжать работу после установки статуса `DONE`.