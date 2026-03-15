# homeMaker Coding Rules

## TypeScript

- Strict mode will be enabled — write as if it is already on
- No `any` — use `unknown` + narrowing or define a proper type
- All new types go in `libs/types/src/` with a named export from `index.ts`

## Express Routes

- Every route file exports a `createXxxRoutes(services) => Router` factory function
- Input validated with zod (or inline type narrowing) at the route boundary
- Return `{ success: true, data }` or `{ success: false, error: string }` — never raw data
- Use `try/catch` in every handler; log errors with `createLogger('RouteName')`

## Frontend Components

- Functional components only — no class components
- Co-locate hooks in a `hooks/` subdirectory within the view folder
- Use `useQuery` (React Query) for data fetching, `useMutation` for writes
- Never import from `apps/server/` in UI code — use the HTTP API client

## SQLite / Persistence

- Use the existing SQLite connection pattern from other services
- Run migrations in service constructors via `db.exec(CREATE TABLE IF NOT EXISTS ...)`
- All timestamps stored as ISO-8601 strings

## Secrets Handling

- Secrets encrypted with AES-256-GCM before write, decrypted on read
- Master key from env var `HOMEMAKER_VAULT_KEY` (32-byte hex)
- Never log decrypted values

## Sensors

- External IoT devices POST to `POST /api/sensors/report` with their registered ID
- Register on startup via `POST /api/sensors/register`
- Use WebSocket events (`sensor:data-received`) for real-time UI updates

## Module-Specific Rules

### Gamification

- All XP awards MUST go through `gamificationService.awardXp()` — never write XP directly to the database
- Always emit `gamification:xp-gained` and `gamification:achievement-unlocked` events via the service
- Home Health Score must be recalculated after any data mutation in Inventory, Maintenance, Sensors, or Budget modules

### Inventory

- Monetary amounts (purchase price, current value) stored as integers in cents — never floating point dollars
- Always link sensor IDs by reference; do not embed sensor data in inventory records

### Maintenance

- `intervalDays` must always be a positive integer (>0)
- `nextDueAt` is auto-calculated from `lastCompletedAt + intervalDays` — never store user-supplied values directly
- Link to vendors by ID only; do not embed vendor data in maintenance records

### Vendors

- Phone numbers stored as strings to preserve formatting (e.g., "(555) 123-4567")
- Trade categories use a fixed enum — do not allow free-form category creation

### Shared Database

- All services use the shared `homemaker.db` from `ServiceContainer` — do NOT create standalone SQLite files
- Use WAL mode pragma in service initialization: `db.exec('PRAGMA journal_mode=WAL')`
- Enable foreign keys: `db.exec('PRAGMA foreign_keys=ON')`
