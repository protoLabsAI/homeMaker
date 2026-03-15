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
