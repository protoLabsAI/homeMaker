# Auto-mode

Auto-mode lets the AI agent pick up tasks from your board's backlog and work on them without manual intervention. This page explains what auto-mode does, how to start and stop it, and how it selects which model to use.

## What auto-mode does

When auto-mode is running, the agent:

1. Polls the board for tasks in `backlog` with no unresolved dependencies
2. Picks the next ready task
3. Reads the task description and any linked context
4. Produces a written output (research, plan, summary)
5. Moves the task to `review` when done
6. Picks up the next task

Auto-mode works through the backlog sequentially, respecting dependency order.

## Start and stop auto-mode

From the UI, click **Auto** in the top navigation bar to toggle auto-mode on and off.

The button shows a pulsing indicator while auto-mode is active.

## What it does not do

Auto-mode produces text output. It does not:

- Modify your inventory, maintenance, or other module data
- Send emails or messages
- Make purchases or bookings
- Execute shell commands or write code

Every task output is text in the agent output panel. You review it, then move the task to `done` or send it back to `backlog` with a note.

## Model selection

Auto-mode selects a model based on the task's declared complexity:

| Complexity          | Model  | When to use                          |
| ------------------- | ------ | ------------------------------------ |
| `small`             | Haiku  | Quick lookups, simple questions      |
| `medium` or `large` | Sonnet | Standard research and planning tasks |
| `architectural`     | Opus   | Complex multi-part analysis          |

Set complexity in the task description or leave it unset — the agent defaults to Sonnet.

## Pausing mid-task

If you stop auto-mode while a task is in progress, the task reverts to `backlog`. Work already produced is saved in the output panel but not finalized.

## Next steps

- [The board](./board.md) — task statuses, dependencies, and epics
- [How it works](./how-it-works.md) — the full agent pipeline explained
