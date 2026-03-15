# Home inventory and asset tracking

Track home assets, warranties, and valuations. Link physical items to IoT sensors for automated monitoring.

## Data model

| Field                | Type           | Description                                              |
| -------------------- | -------------- | -------------------------------------------------------- |
| `id`                 | string         | UUID                                                     |
| `name`               | string         | Asset name                                               |
| `category`           | string         | Asset category (appliance, electronics, furniture, etc.) |
| `purchaseDate`       | string         | ISO-8601 date                                            |
| `purchasePriceCents` | integer        | Purchase price in cents                                  |
| `currentValueCents`  | integer        | Current estimated value in cents                         |
| `warrantyExpiresAt`  | string \| null | ISO-8601 date, null if no warranty                       |
| `sensorId`           | string \| null | Linked sensor ID for automated status                    |
| `notes`              | string         | Free-form notes                                          |
| `createdAt`          | string         | ISO-8601 timestamp                                       |
| `updatedAt`          | string         | ISO-8601 timestamp                                       |

## API reference

### List assets

```
GET /api/inventory
```

Returns all assets sorted by name.

### Create asset

```
POST /api/inventory
```

```json
{
  "name": "Refrigerator",
  "category": "appliance",
  "purchaseDate": "2022-03-15",
  "purchasePriceCents": 129900,
  "warrantyExpiresAt": "2027-03-15",
  "sensorId": "fridge-temp-01"
}
```

### Update asset

```
PUT /api/inventory/:id
```

### Delete asset

```
DELETE /api/inventory/:id
```

## Sensor linking

Link an asset to a sensor by setting `sensorId`. The inventory view displays the sensor's last reading alongside the asset. When the sensor goes offline, the asset is flagged in the UI.

## Warranty monitoring

Assets with `warrantyExpiresAt` set appear in the warranty expiry dashboard. Warnings appear 30 and 7 days before expiry.

## Amounts

All monetary values are stored as integers in cents. Convert on display:

```typescript
const displayPrice = (asset.purchasePriceCents / 100).toFixed(2);
```
