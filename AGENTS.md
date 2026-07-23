# Instructions for Codex

This repository uses a file-based task workflow.

## Mandatory startup synchronization

When the user sends the exact command `выполни`, Codex must perform the following startup sequence automatically before reading or changing task files:

```bash
git fetch origin
git checkout main
git reset --hard origin/main
```

The user must never be required to type or repeat these commands manually.

After synchronization, read in this order:
1. `AGENTS.md`
2. `docs/CODEX_PROTOCOL.md`
3. `docs/AI_CONTEXT.md`
4. `docs/PROJECT_STATE.md`
5. `docs/TECH_DEBT.md`
6. `docs/TASK.md`

Reading `docs/TASK.md` directly with `cat` is optional; Codex may use any reliable file-reading method available in its environment.

Do not run the hard-reset startup sequence for the command `слей`, because the completed `docs/TASK.md` and `docs/REPORT.md` may exist on the task branch or Pull Request being verified. Follow the dedicated merge workflow instead.

Only execute a task when `docs/TASK.md` contains `Status: READY`.
After completing it, update `docs/REPORT.md` and all project documentation required by the protocol.
Do not merge unless the user explicitly sends the command `слей`.

## Short Commands

The user may control Codex with these exact short commands:

### `выполни`
Treat this as:
1. Automatically synchronize local `main` with `origin/main` using the mandatory startup sequence above.
2. Read all required workflow files.
3. Execute only the active task from `docs/TASK.md` when its status is `READY`.
4. Run validation, update the report and required documentation.
5. Commit and push the task branch and create or update the Pull Request when available.
6. Set the task status to `DONE` after successful completion.
7. Do not merge.

### `слей`
Treat this as an explicit user authorization to merge the completed task Pull Request.
Before merging, verify all of the following:
1. `docs/TASK.md` in the task branch or Pull Request has status `DONE`.
2. `docs/REPORT.md` in the task branch or Pull Request has `Status: SUCCESS` and `Safe To Merge: YES`.
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
