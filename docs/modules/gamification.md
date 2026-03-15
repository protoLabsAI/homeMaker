# Gamification

Track home management progress through XP, levels, achievements, streaks, AI-generated quests, and the Home Health Score.

## Home Health Score

A 0--100 score representing the overall health of the home. Calculated across 4 pillars:

| Pillar      | Weight | What it measures                                    |
| ----------- | ------ | --------------------------------------------------- |
| Maintenance | 30%    | Overdue tasks, completion rate, streak              |
| Sensors     | 25%    | Online ratio, stale reading ratio                   |
| Budget      | 25%    | Monthly budget adherence, tracking consistency      |
| Inventory   | 20%    | Warranty coverage, asset documentation completeness |

The score recalculates automatically after mutations in any of the 4 pillars.

## XP sources

| Action                       | XP                |
| ---------------------------- | ----------------- |
| Complete a maintenance task  | 50                |
| Add an inventory item        | 20                |
| Log a budget entry           | 10                |
| Keep a sensor online for 24h | 5                 |
| Complete an AI quest         | 100--500 (varies) |
| Unlock a vault item          | 15                |
| Add a vendor                 | 10                |

## Level progression

10 tiers with increasing XP thresholds:

| Level | Tier          | XP required |
| ----- | ------------- | ----------- |
| 1     | Novice        | 0           |
| 2     | Apprentice    | 500         |
| 3     | Homeowner     | 1,500       |
| 4     | Maintainer    | 3,500       |
| 5     | Steward       | 7,000       |
| 6     | Caretaker     | 13,000      |
| 7     | Guardian      | 22,000      |
| 8     | Warden        | 35,000      |
| 9     | Master        | 55,000      |
| 10    | Home Champion | 85,000      |

## Achievements

30 achievements across 6 categories:

| Category    | Examples                                                            |
| ----------- | ------------------------------------------------------------------- |
| Maintenance | First task completed, 7-day streak, 30 tasks complete, zero overdue |
| Inventory   | First asset added, 10 items tracked, warranty documented            |
| Budget      | First entry logged, 30-day tracking streak, monthly under budget    |
| Sensors     | First sensor registered, 5 sensors online, 7-day uptime             |
| Vault       | First secret stored, 10 secrets stored                              |
| Overall     | Home Health Score 80+, Home Health Score 100, level 5 reached       |

## Streaks

Streaks increment when a user takes a qualifying action on consecutive days. Current streak types:

- Maintenance completion streak
- Budget logging streak

Streaks reset at midnight local time if no qualifying action was taken the previous day.

## AI quests

The `QuestGeneratorService` uses Claude to generate personalized quests based on the current home state. Quests are one-time objectives with a defined reward. Examples:

- "Complete all overdue maintenance tasks this week" (500 XP)
- "Document warranties for your top 5 appliances" (200 XP)
- "Log your household budget daily for 7 days" (300 XP)

## WebSocket events

| Event                               | Payload                                |
| ----------------------------------- | -------------------------------------- |
| `gamification:xp-gained`            | `{ source, amount, total, featureId }` |
| `gamification:achievement-unlocked` | `{ achievement }`                      |
| `gamification:level-up`             | `{ newLevel, tier, totalXp }`          |
| `gamification:health-score-updated` | `{ score, pillars }`                   |
| `gamification:quest-generated`      | `{ quest }`                            |
| `gamification:streak-updated`       | `{ type, count }`                      |

## API reference

### Get profile

```
GET /api/gamification/profile
```

Returns XP, level, tier, achievements, active quests, and streaks.

### Get Home Health Score

```
GET /api/gamification/health-score
```

Returns current score and per-pillar breakdown.

### Trigger score recalculation

```
POST /api/gamification/health-score/recalculate
```
