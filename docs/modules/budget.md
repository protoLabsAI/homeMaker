# Budget tracking

Log income and expenses, categorize transactions, and view monthly summaries.

## Data model

| Field         | Type                  | Description             |
| ------------- | --------------------- | ----------------------- |
| `id`          | string                | UUID                    |
| `type`        | `income` \| `expense` | Transaction type        |
| `amountCents` | integer               | Amount in cents         |
| `category`    | string                | Category name           |
| `description` | string                | Transaction description |
| `date`        | string                | ISO-8601 date           |
| `createdAt`   | string                | ISO-8601 timestamp      |

All monetary amounts are stored as integers in cents.

## API reference

### List transactions

```
GET /api/budget/transactions
```

Query params:

- `month=2026-03` — filter by month (YYYY-MM)
- `type=expense` — filter by type
- `category=utilities` — filter by category

### Create transaction

```
POST /api/budget/transactions
```

```json
{
  "type": "expense",
  "amountCents": 12500,
  "category": "utilities",
  "description": "Electric bill — March",
  "date": "2026-03-01"
}
```

### Update transaction

```
PUT /api/budget/transactions/:id
```

### Delete transaction

```
DELETE /api/budget/transactions/:id
```

### Monthly summary

```
GET /api/budget/summary?month=2026-03
```

Returns total income, total expenses, net, and per-category breakdown for the month.

## Categories

Categories are free-form strings. Common examples: `utilities`, `groceries`, `maintenance`, `insurance`, `mortgage`, `entertainment`, `subscriptions`.
