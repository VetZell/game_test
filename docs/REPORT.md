# Task
TASK-020 — Исправить mobile layout: убрать наложения, обрезание карточек и конфликт нижней навигации со сценой

## Status
SUCCESS

## Summary
- Audited the mobile HUD, scene overlays, scene-bottom controls, chat CTA, action section and bottom navigation in `frontend/src/App.tsx`, `frontend/src/index.css`, and the existing frontend integration coverage.
- Fixed the root HUD conflict: TASK-018 mobile CSS changed `.hud-panel` to a one-column grid at `max-width: 860px`, so the time/day card and characteristics became two stacked sections; the stats row then scrolled inside that second row and could look clipped on iPhone widths.
- Reworked the HUD as one horizontal flex panel: compact time/day/period/day-advance card remains fixed on the left, and all five stats live in the right-side `.compact-stats-row` in the same row.
- Preserved the required stat set and values, with visible order `Любовь`, `Настроение`, `Энергия`, `Сытость`, `Спокойствие`, and progress indicators for all five cards.
- Made the stats area internally horizontally scrollable on 320–430 px with touch-friendly momentum scrolling, scroll snap, and a subtle edge fade, while preventing page-level horizontal overflow.
- Fixed scene floating-card overlap by grouping wallet/resources and Marina speech into `.scene-top-overlays` with constrained widths on narrow screens.
- Fixed the scene-bottom conflict by wrapping `Фокус сейчас` and the `Поговорить` CTA in `.scene-bottom-controls`; on narrow screens the controls stack inside the scene panel instead of colliding with fixed bottom navigation.
- Increased bottom safe-area padding and kept the fixed navigation in a stable single-row grid so it does not cover scene-bottom controls or squeeze labels into overlapping text.
- Kept backend API, gameplay economy, Telegram auth, CORS, database/Alembic, personality/memory logic, action content and day progression unchanged.

## Files Changed
- `frontend/src/App.tsx` — reordered stats to the required HUD order, added `scene-top-overlays`, and added the explicit `scene-bottom-controls` wrapper around focus/chat controls.
- `frontend/src/index.css` — converted mobile HUD to one horizontal flex row, added constrained internal stat scrolling, adjusted scene overlay/control layout, safe-area bottom padding, bottom navigation sizing and narrow viewport fallbacks.
- `frontend/src/App.integration.test.tsx` — expanded frontend integration coverage for the one-row HUD structure, stat order/presence, scene-bottom controls, talk CTA and bottom navigation.
- `docs/ARCHITECTURE.md` — updated frontend/current-boundary notes for TASK-020 layout behavior and responsive validation.
- `docs/PROJECT_STATE.md` — recorded the corrected mobile HUD/scene/navigation state.
- `docs/ROADMAP.md` — marked TASK-020 completed.
- `docs/CHANGELOG.md` — added TASK-020 changelog entry.
- `docs/TASK.md` — changed status from `READY` to `DONE`.
- `docs/REPORT.md` — replaced with this report.

## Problems Found
- Mobile HUD was explicitly switched to one-column layout at `max-width: 860px`, which violated the desired single horizontal panel and made stats feel like a separate clipped row.
- The stats row used an internal horizontal scroll, but the surrounding HUD/card layout did not reserve a fixed left time block plus a flexible right scroll region in one row.
- At small widths the top scene wallet card and Marina speech bubble could consume more horizontal space than the panel provided.
- `Фокус сейчас` and `Поговорить` were separate absolute-positioned controls near the bottom of the scene; together with the fixed bottom nav this created a visual stacking/overlap risk.
- The bottom nav switched to a 2×2 grid at `max-width: 430px`, increasing its height and worsening the chance of conflict with the scene bottom.

## Problems Fixed
- `.hud-panel` is now a nowrap flex row on mobile and desktop; `.time-card` stays fixed on the left and `.stats-row` flexes to the right with `min-width: 0`.
- `.stats-row` uses internal `overflow-x: auto`, `overscroll-behavior-x: contain`, `-webkit-overflow-scrolling: touch`, scroll snap and padding so the first and last stat cards can be fully reached without page overflow.
- Scene top overlays are now one flex container with constrained wallet/speech widths for 320–430 px, avoiding card intersections and text escape.
- Scene bottom controls are now one controlled stacking context inside `.scene-panel`; on narrow screens they become a compact vertical stack while preserving the talk button touch target.
- Bottom navigation remains a stable single row on 320–430 px, uses safe-area bottom positioning, smaller gaps/padding and readable labels instead of creating a taller 2-row nav.
- `game-shell` bottom padding now reserves additional space for the fixed nav and `env(safe-area-inset-bottom)`.

## Responsive Validation
- 320 × 568: PASS — no page-level horizontal overflow; HUD is one row; time block visible on the left; all five stat cards are reachable through stats scroll; bottom nav and scene-bottom controls do not overlap.
- 375 × 667: PASS — no page-level horizontal overflow; HUD remains one row; stats scroll internally; bottom controls/nav bounding boxes do not intersect.
- 390 × 844: PASS — no page-level horizontal overflow; HUD remains one row; last stat card scrolls fully into view; time block remains visible.
- 430 × 932: PASS — no page-level horizontal overflow; HUD remains one row; all five stat cards are available; scene-bottom controls and nav remain separated.

## Tests
- PASS — `git status --short --branch`
- PASS — `git diff --check`
- PASS — `cd frontend && npm ci`
- PASS — `cd frontend && npm test -- --run`
- PASS — `cd frontend && npm run build`
- PASS — `cd frontend && npx playwright install chromium`
- PASS — `cd frontend && npx playwright install-deps chromium`
- PASS — `cd frontend && npx serve -s dist -l 4173` plus Playwright/Chromium responsive DOM and bounding-box assertions for 320×568, 375×667, 390×844 and 430×932.
- PASS — confirmed via Playwright: HUD is one horizontal panel, time block is left of the stats area, no page-level horizontal overflow, all five stat cards are reachable, bottom nav and scene-bottom controls do not overlap, and the last HUD card scrolls fully into view.
- PASS — `cd backend && pytest -q`

## Risks
- Playwright checks run against the local production build with mocked Telegram WebApp/fetch, not inside the real Telegram iOS WebView or live Railway frontend. The repository layout behavior is validated at the requested viewport sizes, but final production confirmation still requires deployment and device/WebView viewing.
- Internal horizontal stat scrolling is intentional on narrow screens; users must swipe the stat strip to see all cards at 320–430 px.

## Technical Debt
- Existing operational debt remains: Railway production service source branch/automatic deploy settings and live Railway PostgreSQL `alembic upgrade head` still require operator verification outside Codex.
- No new repository technical debt was added by TASK-020.

## Safe To Merge
YES

## Commit / PR
- Implementation commit: 9b9db976bc883f1aabf2a0b6ac48446fdfaa1fde
- Pull Request: TBD
