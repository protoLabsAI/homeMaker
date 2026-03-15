# Vendor directory

Manage service provider contacts with trade categories, ratings, and links to assets and maintenance tasks.

## Data model

| Field       | Type            | Description                     |
| ----------- | --------------- | ------------------------------- |
| `id`        | string          | UUID                            |
| `name`      | string          | Business or person name         |
| `trade`     | string          | Trade category (see below)      |
| `phone`     | string          | Phone number (stored as string) |
| `email`     | string \| null  | Email address                   |
| `website`   | string \| null  | Website URL                     |
| `rating`    | integer \| null | 1--5 rating                     |
| `notes`     | string          | Free-form notes                 |
| `createdAt` | string          | ISO-8601 timestamp              |

## Trade categories

`plumbing`, `electrical`, `hvac`, `roofing`, `landscaping`, `cleaning`, `appliance`, `security`, `pest-control`, `general`

## API reference

### List vendors

```
GET /api/vendors
```

Query params:

- `trade=plumbing` — filter by trade

### Create vendor

```
POST /api/vendors
```

```json
{
  "name": "Acme Plumbing",
  "trade": "plumbing",
  "phone": "(555) 123-4567",
  "email": "contact@acmeplumbing.example",
  "rating": 5
}
```

### Update vendor

```
PUT /api/vendors/:id
```

### Delete vendor

```
DELETE /api/vendors/:id
```

## Phone number storage

Phone numbers are stored as strings to preserve formatting. The API does not normalize formats — store whatever format is useful (`(555) 123-4567`, `555-123-4567`, `+15551234567`).
