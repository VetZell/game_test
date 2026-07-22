# AI Project Context

## Project
- Name: «День Марины»
- Repository: `VetZell/game_test`
- Type: Telegram Mini App game

## Stack
- Frontend: React, TypeScript
- Backend: FastAPI, Python
- Database: PostgreSQL
- Hosting: Railway
- Integration: Telegram Mini Apps

## Product Direction
Create a warm, responsive virtual-character experience centered on Marina, with emotions, activities, progression, economy, personality and memory.

## Engineering Principles
- Preserve working behavior unless the task explicitly changes it.
- Prefer strict typing and explicit validation.
- Keep visual assets and domain configuration centralized.
- Keep business logic out of UI components and HTTP route handlers when practical.
- Treat server-side validation as authoritative.
- Protect economy-changing operations from duplication and race conditions.
- Keep documentation synchronized with verified code.

## Safety Rules
- Never expose secrets or Telegram bot tokens.
- Never trust client-provided player identity or economy values.
- Never perform automatic merge.
- Do not claim tests, commits, pushes or PRs that did not actually occur.
