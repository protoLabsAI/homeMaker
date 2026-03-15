# Calendar

Schedule household events, track milestones, and automate recurring jobs from a single view.

## Event types

| Type          | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `custom`      | General household events (appointments, deliveries, etc.)        |
| `milestone`   | Project milestones for house improvement work                    |
| `maintenance` | Scheduled maintenance tasks (linked from the Maintenance module) |
| `job`         | Timed automations that execute a command or trigger an agent     |
| `feature`     | Feature work milestones (AI-generated)                           |
| `ceremony`    | Recurring AI pipeline events                                     |
| `google`      | Events synced from Google Calendar                               |

## Data model

| Field         | Type                   | Description                                      |
| ------------- | ---------------------- | ------------------------------------------------ |
| `id`          | string                 | UUID                                             |
| `projectPath` | string                 | Project this event belongs to                    |
| `title`       | string                 | Event title                                      |
| `date`        | string                 | Start date (`YYYY-MM-DD`)                        |
| `endDate`     | string \| undefined    | End date for multi-day events (`YYYY-MM-DD`)     |
| `type`        | CalendarEventType      | See event types table above                      |
| `time`        | string \| undefined    | Time in `HH:mm` 24-hour format (job events only) |
| `jobAction`   | JobAction \| undefined | Action to run (job events only)                  |
| `jobStatus`   | string \| undefined    | `pending`, `running`, `completed`, `failed`      |
| `description` | string \| undefined    | Notes or details                                 |
| `color`       | string \| undefined    | Display color (hex, e.g. `#4f46e5`)              |
| `url`         | string \| undefined    | Link to an external resource                     |
| `allDay`      | boolean \| undefined   | Whether the event spans the full day             |
| `createdAt`   | string                 | ISO-8601 creation timestamp                      |
| `updatedAt`   | string                 | ISO-8601 last-updated timestamp                  |

## API reference

All calendar endpoints accept JSON bodies and require `projectPath`.

### List events

```
POST /api/calendar/list
```

```json
{
  "projectPath": "/home/user/my-house",
  "startDate": "2026-03-01",
  "endDate": "2026-03-31",
  "types": ["custom", "maintenance"]
}
```

`startDate`, `endDate`, and `types` are all optional. Omitting them returns all events.

### Create event

```
POST /api/calendar/create
```

```json
{
  "projectPath": "/home/user/my-house",
  "title": "HVAC filter replacement",
  "date": "2026-04-01",
  "type": "custom",
  "description": "Replace 20x25x1 MERV-13 filters",
  "color": "#f97316"
}
```

Required fields: `projectPath`, `title`, `date`, `type`.

### Create a scheduled job

Job events run an action at a specific time. Set `type: "job"` and supply `time` (HH:mm) and `jobAction`:

```json
{
  "projectPath": "/home/user/my-house",
  "title": "Nightly backup",
  "date": "2026-04-01",
  "type": "job",
  "time": "02:30",
  "jobAction": {
    "type": "run-command",
    "command": "npm run backup"
  }
}
```

Available job action types:

| `type`           | Required fields           | Description                     |
| ---------------- | ------------------------- | ------------------------------- |
| `run-command`    | `command`, optional `cwd` | Run a shell command             |
| `start-agent`    | `featureId`               | Start an AI agent for a feature |
| `run-automation` | `automationId`            | Trigger a saved automation      |

> **Note:** `run-command` only accepts a single command with no shell metacharacters (`;`, `&&`, `|`, `>`, `$`). Use a script file for complex logic.

### Update event

```
POST /api/calendar/update
```

```json
{
  "projectPath": "/home/user/my-house",
  "id": "evt_abc123",
  "title": "HVAC filter — done",
  "color": "#22c55e"
}
```

Pass only the fields you want to change alongside `projectPath` and `id`.

### Delete event

```
POST /api/calendar/delete
```

```json
{
  "projectPath": "/home/user/my-house",
  "id": "evt_abc123"
}
```

### Run a job manually

Trigger a pending job event immediately, without waiting for its scheduled time:

```
POST /api/calendar/run-job
```

```json
{
  "projectPath": "/home/user/my-house",
  "id": "evt_abc123"
}
```

Returns immediately — job execution continues in the background. Poll `POST /api/calendar/list` to check `jobStatus`.

## WebSocket events

| Event                    | Payload                           |
| ------------------------ | --------------------------------- |
| `calendar:event:created` | `{ eventId, projectPath, event }` |
| `calendar:event:updated` | `{ eventId, projectPath, event }` |
| `calendar:event:deleted` | `{ eventId, projectPath }`        |

## Next steps

- [Maintenance module](./maintenance.md) — link recurring tasks to calendar dates
- [Board module](../platform/board.md) — track house projects alongside your schedule
