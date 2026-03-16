# The board

The board is a Kanban-style project tracker for house projects. This page covers the five task statuses, how dependencies control execution order, and how to group tasks into epics.

## Task statuses

```
backlog → in_progress → review → done
              |              |
           blocked ←─────────┘
```

| Status        | Meaning                                                |
| ------------- | ------------------------------------------------------ |
| `backlog`     | Not started. Ready to pick up if dependencies are met. |
| `in_progress` | Being worked on.                                       |
| `review`      | Work done, awaiting review or approval.                |
| `done`        | Complete.                                              |
| `blocked`     | Cannot proceed — waiting on something external.        |

Move tasks forward by dragging cards or using the status dropdown. There is no restriction on which transitions are allowed — you can move a task directly from `backlog` to `done`.

## Create a task

1. Click **+ Add task** in the backlog column.
2. Give it a title and description.
3. Optionally set a complexity (`small`, `medium`, `large`, `architectural`) to hint at the model the agent should use.
4. Click **Save**.

## Add a dependency

A dependency prevents a task from being picked up by auto-mode until the dependency is in `done`.

1. Open a task.
2. In the **Dependencies** field, type the title or ID of another task and select it.
3. Save.

The task will show as blocked with a dependency indicator until the upstream task completes.

## Epics

An epic is a group of related tasks. Epics let you track a larger project (e.g., "Kitchen renovation") across multiple tasks.

1. Create an epic from the **Epics** panel in the sidebar.
2. Open individual tasks and assign them to the epic.
3. The epic card shows completion progress across all its tasks.

Epics do not affect execution order — that is controlled by task dependencies.

## Tips

- Add context to task descriptions: include photos, measurements, or notes. The agent will reference them.
- Use the `blocked` status for tasks waiting on a contractor quote or delivery. This keeps them visible without cluttering the active work.
- Break large projects into tasks of roughly equal size — one task per distinct piece of work.

## Next steps

- [Auto-mode](./auto-mode.md) — let the agent pick up and execute backlog tasks
- [How it works](./how-it-works.md) — the full pipeline behind the board
