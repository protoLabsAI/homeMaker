# homeMaker Agent Context

## What Exists

All modules currently implemented in homeMaker:

- **Board** — Kanban task tracking for house projects (backlog -> done)
- **Calendar** — CRUD event management for household schedules
- **Sensors** — IoT device registry, real-time readings, history persistence, HA integration
- **Budget** — Income/expense tracking, categories, monthly summaries
- **Vault** — AES-256-GCM encrypted secrets storage
- **Inventory** — Home asset tracking, warranties, valuations, sensor linking
- **Maintenance** — Recurring obligation scheduling, completion history, vendor linking
- **Vendors** — Service provider directory, trade categories, ratings
- **Gamification** — Home Health Score (0-100), XP/levels, 30 achievements, AI quests, streaks

## Gamification Awareness

Your implementation work earns XP for the homemaker and can trigger achievements. The gamification system tracks:

- **XP sources**: completing maintenance tasks, adding inventory items, logging budget entries, unlocking vault items, keeping sensors online
- **Achievements**: first maintenance completed, inventory milestones, budget streaks, sensor uptime awards
- **Home Health Score**: calculated across 4 pillars — Maintenance (30%), Sensors (25%), Budget (25%), Inventory (20%)

When you add or modify features that interact with these modules, call `gamificationService.awardXp()` for relevant user actions. Do NOT write XP directly to the database.

## Shared Database Pattern

All services share a single SQLite database (`homemaker.db`) with WAL mode and foreign keys enabled. Services receive the `Database` instance via constructor injection from `ServiceContainer`.

```typescript
// Pattern for service constructors
constructor(private db: Database) {
  this.db.exec(`CREATE TABLE IF NOT EXISTS my_table (...)`);
}
```

Do NOT create standalone SQLite files per service. Always use the shared DB from `ServiceContainer`.

## Adding New Backend Modules

Follow the sensor registry pattern, using the shared DB:

1. Define types in `libs/types/src/`
2. Create service in `apps/server/src/services/` — accept `Database` via constructor
3. Create routes in `apps/server/src/routes/<module>/`
4. Wire into `apps/server/src/server/routes.ts`
5. Add to `ServiceContainer` in `apps/server/src/server/services.ts`

## Adding New UI Views

After creating the view component and route file, add to sidebar navigation (`apps/ui/src/components/layout/sidebar/hooks/use-navigation.ts`). Current nav items include:
board, calendar, sensors, inventory, vendors, maintenance, budget, vault, profile

## Key Invariants

- Gamification: all XP awards go through `gamificationService.awardXp()` — never direct DB writes
- Inventory: amounts in cents (integer), never floating point dollars
- Maintenance: `intervalDays` is always a positive integer, `nextDueAt` auto-calculated
- Vendors: phone numbers stored as strings (preserve formatting)
- Home Health Score: always recalculate after data mutations, never cache stale scores
