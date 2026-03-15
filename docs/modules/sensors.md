# Sensor registry and monitoring

Register IoT devices, receive periodic readings, monitor online/offline status, and persist history.

## Registration

Sensors register on startup with a POST to the server:

```
POST /api/sensors/register
```

```json
{
  "id": "living-room-temp-01",
  "name": "Living Room Temperature",
  "type": "temperature",
  "unit": "°C",
  "location": "living-room"
}
```

## Reporting readings

Sensors POST readings periodically:

```
POST /api/sensors/report
```

```json
{
  "sensorId": "living-room-temp-01",
  "value": 21.5,
  "timestamp": "2026-03-15T14:00:00.000Z"
}
```

## Status lifecycle

| Status    | Condition                                               |
| --------- | ------------------------------------------------------- |
| `online`  | Reading received within TTL window (default: 5 minutes) |
| `stale`   | No reading for 5--30 minutes                            |
| `offline` | No reading for 30+ minutes                              |

## History persistence

Readings are stored in `homemaker.db` with configurable retention. Set `SENSOR_HISTORY_RETENTION_DAYS` (default: 30) to control how long readings are kept.

Query history:

```
GET /api/sensors/:id/history?from=2026-03-01&to=2026-03-15
```

## Home Assistant integration

homeMaker subscribes to the Home Assistant WebSocket API to receive state changes from HA entities. Configure the HA URL and token in the app settings. HA entity state changes are mapped to sensor readings automatically.

## WebSocket events

| Event                   | Payload                                |
| ----------------------- | -------------------------------------- |
| `sensor:registered`     | `{ sensor }`                           |
| `sensor:data-received`  | `{ sensorId, value, timestamp }`       |
| `sensor:status-changed` | `{ sensorId, status, previousStatus }` |

## API reference

### List sensors

```
GET /api/sensors
```

### Get sensor state

```
GET /api/sensors/:id
```

### Push command to sensor

```
POST /api/sensors/:id/command
```

```json
{
  "command": "set-threshold",
  "payload": { "min": 18, "max": 26 }
}
```
