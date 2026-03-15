# Connect Home Assistant sensors

This guide shows you how to stream sensor readings from Home Assistant (HA) into the homeMaker sensor dashboard. HA pushes state changes to homeMaker's existing sensor registry via HTTP POST — no homeMaker code changes are needed.

**Command flow:** HA sends data to homeMaker. homeMaker does NOT control HA devices.

## Prerequisites

- Home Assistant instance accessible from your homeMaker host (Tailscale recommended)
- homeMaker running and reachable on your network (default port `3008`)
- `AUTOMAKER_API_KEY` set in your homeMaker `.env` (required for sensor report endpoint)
- HA version 2023.1 or newer (`rest_command` service with template payloads)

## Sensor ID naming convention

homeMaker sensor IDs for HA devices follow this format:

```
ha:{entity_id}
```

Examples:

| HA entity_id                     | homeMaker sensorId                  |
| -------------------------------- | ----------------------------------- |
| `sensor.living_room_temperature` | `ha:sensor.living_room_temperature` |
| `binary_sensor.front_door`       | `ha:binary_sensor.front_door`       |
| `sensor.energy_meter_power`      | `ha:sensor.energy_meter_power`      |

This prefix lets you filter HA sensors from native sensors in the homeMaker dashboard.

## Step 1: Enable HA packages

Home Assistant [packages](https://www.home-assistant.io/docs/configuration/packages/) let you define automations and services in separate files. Add this to your `configuration.yaml`:

```yaml
homeassistant:
  packages: !include_dir_named packages
```

Create the directory if it doesn't exist:

```bash
mkdir -p /config/packages
```

## Step 2: Add the register-sensors automation

Copy [`templates/ha-register-sensors.yaml`](./templates/ha-register-sensors.yaml) to `/config/packages/homeMaker-register.yaml`.

Edit the file:

1. Replace `YOUR_HOMEMAKER_HOST` with your homeMaker IP or hostname (e.g. `100.64.1.10` for Tailscale)
2. Add one `service: rest_command.homeMaker_register_sensor` block per sensor you want to track
3. Use the `ha:{entity_id}` naming convention for each `id` field

This automation fires once on HA startup and registers every listed sensor in homeMaker.

## Step 3: Add the sensor bridge automation

Copy [`templates/ha-sensor-bridge.yaml`](./templates/ha-sensor-bridge.yaml) to `/config/packages/homeMaker-bridge.yaml`.

Edit the file:

1. Replace `YOUR_HOMEMAKER_HOST` with your homeMaker host
2. Replace `YOUR_AUTOMAKER_API_KEY` with the value of `AUTOMAKER_API_KEY` from your homeMaker `.env`
3. Add each HA entity you want to stream under `trigger.entity_id`

Whenever a listed entity changes state, the automation POSTs the new reading to homeMaker.

## Step 4: Restart Home Assistant

```bash
# Via HA CLI
ha core restart

# Or in the UI: Settings → System → Restart
```

## Step 5: Verify readings in homeMaker

Open the homeMaker sensor dashboard (`http://YOUR_HOMEMAKER_HOST:3007/sensors`). Each registered HA sensor should appear. After any state change in HA, the **Last Seen** timestamp updates and the sensor moves to `active` state.

To trigger a test reading manually from HA Developer Tools:

```yaml
# Developer Tools → Services → rest_command.homeMaker_report_sensor
service: rest_command.homeMaker_report_sensor
data:
  sensor_id: 'ha:sensor.living_room_temperature'
  value: '21.5'
  unit: '°C'
  entity_id: 'sensor.living_room_temperature'
  attributes: '{}'
```

## API reference

| Endpoint                | Method | Auth                   | Purpose                            |
| ----------------------- | ------ | ---------------------- | ---------------------------------- |
| `/api/sensors/register` | POST   | None                   | Register or re-register a sensor   |
| `/api/sensors/report`   | POST   | API key (Bearer token) | Post a new sensor reading          |
| `/api/sensors`          | GET    | None                   | List all sensors with latest state |

### Register payload

```json
{
  "id": "ha:sensor.living_room_temperature",
  "name": "Living Room Temperature",
  "description": "Optional free-form description"
}
```

### Report payload

```json
{
  "sensorId": "ha:sensor.living_room_temperature",
  "data": {
    "value": "22.5",
    "unit": "°C",
    "entity_id": "sensor.living_room_temperature",
    "attributes": {}
  }
}
```

## Troubleshooting

| Symptom                                 | Likely cause                        | Fix                                                                                     |
| --------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| Sensor not appearing in dashboard       | Registration automation didn't fire | Check HA logs, re-run automation manually                                               |
| Sensor shows `offline`                  | No readings received                | Check bridge automation trigger entities, verify API key                                |
| `401 Unauthorized` on report calls      | Wrong or missing API key            | Verify `AUTOMAKER_API_KEY` in homeMaker `.env` and HA package file                      |
| `404 Not Found` on report calls         | Sensor not registered               | Run the register automation first, then retry                                           |
| Readings appear but state stays `stale` | Too-infrequent HA state changes     | Adjust the TTL in homeMaker settings or add a periodic trigger to the bridge automation |

## Next steps

- [Sensor registry reference](../reference/sensors) — sensor states, TTL configuration, data schema
- Add HA sensors to inventory items for warranty and valuation tracking
