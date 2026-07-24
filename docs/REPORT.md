# Task
TASK-021 — Уменьшить верхнюю панель состояния и полностью убрать горизонтальный scroll характеристик

## Status
SUCCESS

## Summary
- Audited the current HUD implementation after TASK-020 in `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/styles.css`, `frontend/src/room-fixes.css`, and frontend integration coverage.
- Found that the actual production bundle imports `styles.css` and `room-fixes.css`; those files still overrode the TASK-020 `index.css` rules with a tall `min-height: 120px` HUD and `overflow-x: auto` stat strip.
- Kept the HUD as one horizontal row and removed the horizontal stat scroll from the imported runtime CSS: `.compact-hud` is now a nowrap flex row, `.compact-time-card` stays fixed on the left, and `.compact-stats-row` is a five-column grid with all stat cards visible at once.
- Reduced HUD height by shrinking time-card width/padding, compacting day/period text, changing the visible day-advance control to an arrow while preserving the full `aria-label`, reducing stat card padding/gaps, and shortening only the visible stat labels.
- Preserved full stat identity and order through article `aria-label`s: `Любовь`, `Настроение`, `Энергия`, `Сытость`, `Спокойствие`.
- Preserved `/100` values and progress indicators for all five stats.
- Added a CSS regression test for the no-scroll mobile HUD override and updated the integration test for full accessible stat names plus compact visual labels.
- Ran Playwright/Chromium responsive validation on 320×568, 375×667, 390×844 and 430×932 with mocked Telegram WebApp/fetch.
- Backend API, economy, day progression, Telegram auth, CORS, database/Alembic and personality/memory logic were not changed.

## Files Changed
- `frontend/src/App.tsx` — added compact visual stat labels while preserving full accessible stat names/order, and shortened the visible day-advance button text to an arrow.
- `frontend/src/index.css` — updated the audited HUD CSS to remove mobile stat scrolling and use compact no-scroll sizing.
- `frontend/src/styles.css` — added imported runtime TASK-021 compact HUD overrides for the production bundle.
- `frontend/src/room-fixes.css` — added final imported runtime HUD overrides after room-scene CSS so the production bundle cannot reintroduce the old tall scrollable HUD.
- `frontend/src/App.integration.test.tsx` — updated HUD assertions for full accessible stat labels and compact visual labels.
- `frontend/src/hudCss.test.ts` — added static CSS regression coverage that rejects HUD `overflow-x: auto`, mask fade and scroll snap in the final mobile override.
- `frontend/package.json` and `frontend/package-lock.json` — added `@types/node` as a dev dependency for the CSS file-reading Vitest test only.
- `docs/ARCHITECTURE.md` — documented the imported CSS boundary and no-scroll HUD structure.
- `docs/PROJECT_STATE.md` — recorded the TASK-021 no-scroll mobile HUD state.
- `docs/ROADMAP.md` — marked TASK-021 completed.
- `docs/CHANGELOG.md` — added TASK-021 changelog entry.
- `docs/TASK.md` — changed status from `READY` to `DONE`.
- `docs/REPORT.md` — replaced with this report.

## Problems Found
- `frontend/src/main.tsx` imports `styles.css` and `room-fixes.css`, not `index.css`, so production CSS still included the tall room-fix HUD rules.
- `room-fixes.css` overrode HUD layout with `min-height: 120px`, large time/stat padding and `.stats-row { overflow-x: auto }`.
- The stat row used fixed grid-auto columns, so all five stat cards could not appear at 320–430 px without horizontal scrolling.
- The visible day-advance text consumed horizontal space that was needed for no-scroll stat visibility.

## Problems Fixed
- Added final `.compact-*` overrides after room-scene CSS so the actual imported cascade uses the compact no-scroll HUD.
- Changed the stat area to `grid-template-columns: repeat(5, minmax(0, 1fr))`, disabled grid-auto column scrolling, and set the final compact stat row to visible overflow without scrollbars, mask fade or scroll snap.
- Reduced the compact time block to 78px at `max-width: 430px` and 96px above that, with a small arrow-only visible day-advance button and full accessible label.
- Replaced long visible stat labels with compact labels (`Люб`, `Настр`, `Эн`, `Сыт`, `Спок`) while retaining full stat names in `aria-label`s and preserving values/progress meters.

## Responsive Validation
- 320 × 568: PASS — page `scrollWidth=320`, `clientWidth=320`; HUD `scrollWidth=308`, `clientWidth=308`; HUD height `74px`; all five stat cards are inside the HUD; stat row `overflow-x=visible`.
- 375 × 667: PASS — page `scrollWidth=375`, `clientWidth=375`; HUD `scrollWidth=363`, `clientWidth=363`; HUD height `74px`; all five stat cards are inside the HUD; stat row `overflow-x=visible`.
- 390 × 844: PASS — page `scrollWidth=390`, `clientWidth=390`; HUD `scrollWidth=378`, `clientWidth=378`; HUD height `74px`; all five stat cards are inside the HUD; stat row `overflow-x=visible`.
- 430 × 932: PASS — page `scrollWidth=430`, `clientWidth=430`; HUD `scrollWidth=412`, `clientWidth=412`; HUD height `74px`; all five stat cards are inside the HUD; stat row `overflow-x=visible`.

## Tests
- PASS — `git status --short --branch`
- PASS — `git diff --check`
- PASS — `cd frontend && npm ci`
- PASS — `cd frontend && npm test -- --run`
- PASS — `cd frontend && npm run build`
- PASS — `cd frontend && npm install --no-save playwright@1.57.0`
- PASS — `cd frontend && npx playwright install chromium`
- PASS — `cd frontend && npx serve -s dist -l 4173` plus Playwright/Chromium responsive assertions for 320×568, 375×667, 390×844 and 430×932.

## Risks
- Playwright checks run against the local production build with mocked Telegram WebApp/fetch, not inside the real Telegram iOS WebView or live Railway frontend.
- The 320 px HUD necessarily uses short visible stat labels to avoid scrolling; full stat names remain available through accessible labels.

## Technical Debt
- Existing operational debt remains: Railway production source-branch/automatic deploy settings and live Railway PostgreSQL `alembic upgrade head` still require operator verification outside Codex.
- No new repository technical debt was added by TASK-021.

## Safe To Merge
YES

## Commit / PR
- Implementation commit: TBD
- Pull Request: TBD
