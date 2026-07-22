# Instructions for Codex

This repository uses a file-based task workflow.

Before making changes, read in this order:
1. `docs/CODEX_PROTOCOL.md`
2. `docs/PROJECT_STATE.md`
3. `docs/TECH_DEBT.md`
4. `docs/TASK.md`

Only execute a task when `docs/TASK.md` contains `Status: READY`.
After completing it, update `docs/REPORT.md` and all project documentation required by the protocol.
Do not merge unless the user explicitly sends the command `слей`.

## Short Commands

The user may control Codex with these exact short commands:

### `выполни`
Treat this as:
1. Read all required workflow files.
2. Execute only the active task from `docs/TASK.md` when its status is `READY`.
3. Run validation, update the report and required documentation.
4. Commit and push the task branch and create or update the Pull Request when available.
5. Set the task status to `DONE` after successful completion.
6. Do not merge.

### `слей`
Treat this as an explicit user authorization to merge the completed task Pull Request.
Before merging, verify all of the following:
1. `docs/TASK.md` has status `DONE`.
2. `docs/REPORT.md` has `Status: SUCCESS` and `Safe To Merge: YES`.
3. The referenced Pull Request exists, is open, targets `main`, and is mergeable.
4. Required validation reported by the task passed.
5. There are no uncommitted task changes that should be included.

If every condition passes:
1. Merge the referenced Pull Request into `main` using a normal merge or squash merge without force-push or history rewriting.
2. Fetch and update local `main` with `git pull --ff-only origin main`.
3. Verify the Pull Request is merged and report the merge commit SHA and current `main` HEAD.
4. Stop and wait for the next task.

If any condition fails, do not merge. Report the exact blocker and stop.

## Task Status Guard

If `docs/TASK.md` contains `Status: DONE`, the agent must not make changes to code or documentation when handling `выполни`.

In this case, the agent must:

1. Stop execution.
2. Report that there is no active task.
3. Wait until ChatGPT updates `docs/TASK.md` and sets `Status: READY`.

The only exception is the explicit command `слей`, which authorizes only the verified merge workflow described above and does not authorize new code or documentation changes.

Never start a new task on its own initiative.

## Single Source of Truth

The only source of active work is `docs/TASK.md`.

Chat instructions take effect only after they are transferred into `docs/TASK.md`, except for the exact control commands `выполни` and `слей` defined above.

If other chat instructions conflict with `docs/TASK.md`, stop and request that `docs/TASK.md` be updated before continuing.