# Maintenance scheduling

Track recurring home obligations with auto-calculated due dates, completion history, and vendor assignments.

## Data model

| Field             | Type           | Description                           |
| ----------------- | -------------- | ------------------------------------- |
| `id`              | string         | UUID                                  |
| `title`           | string         | Task name                             |
| `description`     | string         | Details                               |
| `intervalDays`    | integer        | Recurrence interval (must be > 0)     |
| `lastCompletedAt` | string \| null | ISO-8601 timestamp of last completion |
| `nextDueAt`       | string         | ISO-8601 date, auto-calculated        |
| `vendorId`        | string \| null | Assigned vendor ID                    |
| `inventoryItemId` | string \| null | Related asset ID                      |
| `notes`           | string         | Free-form notes                       |
| `createdAt`       | string         | ISO-8601 timestamp                    |

`nextDueAt` is always computed as `lastCompletedAt + intervalDays`. Do not set it directly.

## API reference

### List tasks

```
GET /api/maintenance
```

Query params:

- `overdue=true` — return only overdue tasks
- `upcoming=7` — return tasks due within N days

### Create task

```
POST /api/maintenance
```

```json
{
  "title": "Replace HVAC filter",
  "intervalDays": 90,
  "vendorId": "hvac-vendor-01"
}
```

### Complete task

```
POST /api/maintenance/:id/complete
```

Records completion timestamp and recalculates `nextDueAt`.

### Update task

```
PUT /api/maintenance/:id
```

### Delete task

```
DELETE /api/maintenance/:id
```

## Calendar integration

Maintenance tasks with upcoming due dates appear in the Calendar view. Overdue tasks are highlighted in red.

## Vendor linking

Set `vendorId` to associate a task with a vendor from the Vendor Directory. The maintenance view shows vendor contact info inline.
