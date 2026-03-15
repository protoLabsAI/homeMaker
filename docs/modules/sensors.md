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

homeMaker can connect directly to your Home Assistant instance over its WebSocket API. When connected, entity state changes are mapped to sensor readings automatically — no HA automations required.

### Configure the connection

1. Open homeMaker and go to **Settings → Integrations → Home Assistant**.
2. Enter your HA URL (e.g. `http://homeassistant.local:8123`) and a long-lived access token.
3. Click **Test connection** — homeMaker sends a server-side probe to verify credentials (browser-to-HA calls are blocked by CORS on most local HA installs).
4. Enable the toggle to start the live connection.

### Entity ID namespace

All HA-sourced sensors use the `ha:` prefix to avoid collisions with directly-registered IoT devices:

```
ha:sensor.living_room_temperature
ha:binary_sensor.front_door
ha:light.kitchen_overhead
```

### Initial state

On connect, homeMaker fetches the current state of all synced entities via `get_states` before subscribing to `state_changed` events. This ensures sensors show accurate readings immediately rather than waiting for the first change.

### Auth failure behaviour

If the token is rejected, the connection stops permanently and will not auto-retry. Correct the token in Settings and re-enable the integration to reconnect.

### Alternative: push model

If you prefer HA to push data to homeMaker (rather than homeMaker pulling from HA), use the REST API approach instead. See the [Home Assistant integration guide](../integrations/home-assistant.md).

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
