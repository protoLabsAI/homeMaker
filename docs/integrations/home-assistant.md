# Connect Home Assistant sensors

This guide shows you how to bridge Home Assistant sensor data into homeMaker's sensor registry. After completing it, HA entity states will appear in the homeMaker Sensors view and feed into the context aggregator.

## How it works

homeMaker exposes two sensor API endpoints:

- `POST /api/sensors/register` — register a sensor on startup
- `POST /api/sensors/report` — post a periodic reading

You configure Home Assistant automations to call these endpoints whenever a sensor updates.

## Prerequisites

- Home Assistant running on your local network
- homeMaker accessible from Home Assistant (same network, or via Tailscale)
- A long-lived access token from your HA profile

## Step 1: Register a sensor

Call `POST /api/sensors/register` once per sensor, typically in a startup automation.

```yaml
# configuration.yaml — REST command for registration
rest_command:
  register_homemaker_sensor:
    url: "http://homemaker:8579/api/sensors/register"
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

## Step 2: Report readings via automation

Create one automation per sensor (or use a template automation):

```yaml
# automations.yaml
- alias: "Report living room temperature to homeMaker"
  trigger:
    - platform: state
      entity_id: sensor.living_room_temperature
  action:
    - service: rest_command.report_homemaker_sensor
      data:
        sensor_id: "ha:sensor.living_room_temperature"
        value: "{{ states('sensor.living_room_temperature') }}"
        unit: "°F"
```

Add the matching REST command:

```yaml
rest_command:
  report_homemaker_sensor:
    url: "http://homemaker:8579/api/sensors/report"
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

## Step 3: Register on HA startup

To ensure sensors are registered after a restart, add a trigger to the automation:

```yaml
trigger:
  - platform: homeassistant
    event: start
  - platform: state
    entity_id: sensor.living_room_temperature
```

## Sensor naming convention

Use `ha:domain.entity_id` for all HA-sourced sensors:

```
ha:sensor.living_room_temperature
ha:sensor.basement_humidity
ha:binary_sensor.front_door
ha:sensor.electricity_usage
```

This namespace keeps HA sensors distinct from directly-registered IoT devices.

## Verify in homeMaker

1. Open homeMaker at `http://homemaker:8578`.
2. Click **Sensors** in the sidebar.
3. Your registered sensors should appear with their latest reading and an `online` status.

If a sensor shows `stale` or `offline`, check that the HA automation is firing and that the homeMaker server is reachable from HA.

## Next steps

- [Sensor module reference](../modules/sensors.md)
- [Weather widget](./weather.md)
