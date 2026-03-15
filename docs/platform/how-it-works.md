# How homeMaker works

homeMaker is a home management hub with an embedded AI agent pipeline. This page explains the relationship between the board, the AI agent, and the modules that store your home data.

## The two sides of homeMaker

**Module layer** — the inventory, maintenance, sensors, budget, vault, and vendors modules. These store structured data about your home. You interact with them directly through the UI.

**Board + agent layer** — a Kanban board for tracking house projects, combined with an AI agent that can help research, plan, and organize home tasks. The agent operates on tasks you put on the board.

The two layers are independent. You can use the modules without ever putting anything on the board, and you can use the board without connecting it to any module data.

## How the board works

The board is a Kanban board with five statuses:

```
backlog → in_progress → review → done
              |              |
           blocked ←─────────┘
```

You create tasks in `backlog`, move them to `in_progress` when you start, and to `done` when finished. Tasks can be blocked if they depend on something else.

Tasks can have dependencies — a task will not appear ready to work on until all its dependencies are in `done`.

## How the AI agent helps

When you assign a task to the agent (via auto-mode or manually), the agent reads the task description and any linked context, then produces a written report or action plan.

For home management tasks the agent typically:

- Researches contractors, materials, or codes for a project
- Summarizes information from linked files or notes
- Drafts a maintenance schedule or project plan
- Answers questions about past completions or sensor readings

The agent does not write code or modify your database. Its output is a text document that appears in the task's output panel.

## How context shapes agent behavior

Files in `.automaker/context/` are loaded into every agent prompt. You can use this to tell the agent about your home — your zip code, which utilities are in the house, preferred vendors, or any other standing information.

To add context, create a markdown file in `.automaker/context/`:

```bash
echo "# My home\n\nLocated in Austin, TX. 1980 construction. Natural gas heat." \
  > .automaker/context/my-home.md
```

The agent will reference this in all future responses.

## Next steps

- [Auto-mode](./auto-mode.md) — how to let the agent pick up and work on board tasks automatically
- [The board](./board.md) — detailed board usage including dependencies and epics
