# PRD: homeMaker-completion

## Situation

homeMaker has 6 of 8 milestones substantially shipped. Four gaps remain: stale branding, a broken DB wire, a deleted UI, and a missing integration client.

## Problem

The app still presents as 'protoLabs Studio' in setup/dashboard/sidebar flows. Sensor history writes are dead code. Vendor management has no UI. Home Assistant integration is REST-push only with no proactive connection.

## Approach

Four milestones, each independently shippable. Rebrand first (user-facing polish), then wire sensor history DB, rebuild vendor UI, and finally add HA client.

## Results

homeMaker fully branded, all modules functional end-to-end, HA integration bidirectional.

## Constraints

Single-household deployment only. Tailscale-only networking, no cloud sync. SQLite only, no external databases. No new dependencies unless necessary for HA WebSocket.
