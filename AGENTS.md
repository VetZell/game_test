# Instructions for Codex

This repository uses a file-based task workflow.

Before making changes, read in this order:
1. `docs/CODEX_PROTOCOL.md`
2. `docs/PROJECT_STATE.md`
3. `docs/TECH_DEBT.md`
4. `docs/TASK.md`

Only execute a task when `docs/TASK.md` contains `Status: READY`.
After completing it, update `docs/REPORT.md` and all project documentation required by the protocol.
Never merge automatically.

## Task Status Guard

If `docs/TASK.md` contains `Status: DONE`, the agent must not make any changes to code or documentation.

In this case, the agent must:

1. Stop execution.
2. Report that there is no active task.
3. Wait until ChatGPT updates `docs/TASK.md` and sets `Status: READY`.

Never start a new task on its own initiative.

## Single Source of Truth

The only source of active work is `docs/TASK.md`.

Chat instructions take effect only after they are transferred into `docs/TASK.md`.

If chat instructions conflict with `docs/TASK.md`, stop and request that `docs/TASK.md` be updated before continuing.
