# Connect Home Assistant sensors

This guide shows you how to bridge Home Assistant sensor data into homeMaker's sensor registry. After completing it, HA entity states will appear in the homeMaker Sensors view and feed into the context aggregator.

## Two integration approaches

| Approach             | How it works                                                             | Best for                                             |
| -------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| **Direct WebSocket** | homeMaker connects to HA's WebSocket API and subscribes to state changes | Most users — zero HA configuration needed            |
| **Push via REST**    | HA automations call homeMaker's sensor API on state change               | Environments where homeMaker can't reach HA directly |

---

## Direct WebSocket integration (recommended)

homeMaker can connect directly to Home Assistant and receive live entity updates — no HA automations required.

### Prerequisites

- Home Assistant running and reachable from the homeMaker server (same network or via Tailscale)
- A long-lived access token from your HA profile (**Profile → Long-Lived Access Tokens**)

### Set up the connection

1. Open homeMaker and go to **Settings → Integrations → Home Assistant**.
2. Enter your HA URL (e.g. `http://homeassistant.local:8123`) and your token.
3. Click **Test connection** to verify. The test runs server-side — this avoids CORS issues that would block a browser-to-HA probe on most local installs.
4. Enable the toggle to start the live connection.

Once connected, homeMaker fetches the current state of all synced entities immediately, then streams future changes in real time.

### Select which entities to sync

After connecting, homeMaker lists your HA entities. Toggle the ones you want to track as sensors. Your selection is saved in Settings and persists across restarts.

### Entity naming

All HA entities appear in homeMaker with a `ha:` prefix:

```
ha:sensor.living_room_temperature
ha:binary_sensor.front_door
ha:light.kitchen_overhead
```

This namespace keeps HA sensors distinct from directly-registered IoT devices.

### Connection behaviour

- **On connect:** homeMaker fetches current state for all selected entities before subscribing to changes, so readings are accurate from the start.
- **On auth failure:** the connection stops permanently. Correct the token in Settings and re-enable the integration to reconnect. Invalid tokens are never retried automatically.
- **On network error:** homeMaker reconnects automatically with exponential backoff.

---

## Push via REST (alternative)

Use this approach if homeMaker cannot reach HA directly (e.g. reverse-proxy or firewall restrictions).

### Prerequisites

- Home Assistant running on your local network
- homeMaker accessible from Home Assistant (same network, or via Tailscale)
- A long-lived access token from your HA profile

### How it works

homeMaker exposes two sensor API endpoints:

- `POST /api/sensors/register` — register a sensor on startup
- `POST /api/sensors/report` — post a periodic reading

You configure Home Assistant automations to call these endpoints whenever a sensor updates.

### Step 1: Register a sensor

Call `POST /api/sensors/register` once per sensor, typically in a startup automation.

```yaml
# configuration.yaml — REST command for registration
rest_command:
  register_homemaker_sensor:
    url: 'http://homemaker:8579/api/sensors/register'
    method: POST
    headers:
      Content-Type: application/json
    payload: >
      {
        "id": "ha:{{ sensor_id }}",
        "name": "{{ sensor_name }}",
        "type": "{{ sensor_type }}",
        "unit": "{{ unit }}"
      }
```

### Step 2: Report readings via automation

Create one automation per sensor (or use a template automation):

```yaml
# automations.yaml
- alias: 'Report living room temperature to homeMaker'
  trigger:
    - platform: state
      entity_id: sensor.living_room_temperature
  action:
    - service: rest_command.report_homemaker_sensor
      data:
        sensor_id: 'ha:sensor.living_room_temperature'
        value: "{{ states('sensor.living_room_temperature') }}"
        unit: '°F'
```

Add the matching REST command:

```yaml
rest_command:
  report_homemaker_sensor:
    url: 'http://homemaker:8579/api/sensors/report'
    method: POST
    headers:
      Content-Type: application/json
    payload: >
      {
        "id": "{{ sensor_id }}",
        "value": {{ value }},
        "unit": "{{ unit }}"
      }
```

### Step 3: Register on HA startup

To ensure sensors are registered after a restart, add a trigger to the automation:

```yaml
trigger:
  - platform: homeassistant
    event: start
  - platform: state
    entity_id: sensor.living_room_temperature
```

### Sensor naming convention

Use `ha:domain.entity_id` for all HA-sourced sensors:

```
ha:sensor.living_room_temperature
ha:sensor.basement_humidity
ha:binary_sensor.front_door
ha:sensor.electricity_usage
```

This namespace keeps HA sensors distinct from directly-registered IoT devices.

### Verify in homeMaker

1. Open homeMaker at `http://homemaker:8578`.
2. Click **Sensors** in the sidebar.
3. Your registered sensors should appear with their latest reading and an `online` status.

If a sensor shows `stale` or `offline`, check that the HA automation is firing and that the homeMaker server is reachable from HA.

## Next steps

- [Sensor module reference](../modules/sensors.md)
- [Weather widget](./weather.md)
