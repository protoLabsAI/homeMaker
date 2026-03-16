# homeMaker-completion

Ship the remaining 4 milestones to make homeMaker fully branded, all modules functional end-to-end, and Home Assistant integration bidirectional.

**Status:** completed
**Created:** 2026-03-15T22:21:25.905Z
**Updated:** 2026-03-15T23:25:45.502Z

## PRD

### Situation

homeMaker has 6 of 8 milestones substantially shipped. Four gaps remain: stale branding, a broken DB wire, a deleted UI, and a missing integration client.

### Problem

The app still presents as 'protoLabs Studio' in setup/dashboard/sidebar flows. Sensor history writes are dead code. Vendor management has no UI. Home Assistant integration is REST-push only with no proactive connection.

### Approach

Four milestones, each independently shippable. Rebrand first (user-facing polish), then wire sensor history DB, rebuild vendor UI, and finally add HA client.

### Results

homeMaker fully branded, all modules functional end-to-end, HA integration bidirectional.

### Constraints

Single-household deployment only. Tailscale-only networking, no cloud sync. SQLite only, no external databases. No new dependencies unless necessary for HA WebSocket.

## Milestones

### 1. M1: Complete Rebrand

Update all UI strings referencing 'protoLabs Studio' to 'homeMaker'. Update bug report links from protoMaker to homeMaker repo.

**Status:** completed

#### Phases

1. **Update all protoLabs Studio UI references to homeMaker** (small)

### 2. M2: Wire Sensor History DB

Inject SQLite DB into SensorRegistryService so sensor readings persist to the sensor_readings table. Make getHistory() and getHistoryAggregated() return real data.

**Status:** completed

#### Phases

1. **Inject DB into SensorRegistryService and wire persistence** (small)

### 3. M3: Restore Vendor UI

Rebuild the vendor management frontend that was deleted in PR #42. Backend routes and service are intact.

**Status:** completed

#### Phases

1. **Build vendor view components** (medium)
2. **Wire vendor route and navigation** (small)

### 4. M4: Home Assistant Integration Client

Build a dedicated HA WebSocket client that connects to Home Assistant, subscribes to entity state changes, and auto-registers entities as homeMaker sensors.

**Status:** completed

#### Phases

1. **Build HA WebSocket client service** (medium)
2. **Add HA configuration UI** (medium)
