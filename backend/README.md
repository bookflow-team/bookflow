# BookFlow backend

Bun + ElysiaJS + Zod + Drizzle ORM + PostgreSQL. Tests: Jest. API documentation: OpenAPI 3 (Scalar page).

## Run it

```bash
bun install
cp .env.example .env        # then edit DATABASE_URL (Bun loads .env automatically)
bun run db:migrate          # applies ./drizzle/*.sql
bun run dev                 # http://localhost:8000/health   and   /api/v1/openapi
```

`GET /health` also runs `select 1`, so it fails when the database cannot be reached.

## Check it

```bash
cp .env.test.example .env.test   # a SEPARATE database whose name contains "test"
bun run db:migrate               # with DATABASE_URL pointing at that database
bun run test                     # Jest, real database, test files run one after another
bun run typecheck
```

The tests refuse to run against a database whose name does not contain `test`.

## API documentation (OpenAPI)

With the server running:

- `http://localhost:8000/api/v1/openapi` is the interactive page (Scalar). It needs internet for its script.
- `http://localhost:8000/api/v1/openapi/json` is the OpenAPI 3 document itself, for Postman or code generators.

The document is built from the routes. Describe every new route with `detail: { tags, summary, description }` and
`response: { 200: ..., 4xx: errorResponse }` (see `GET /health` in `src/app.ts` and `src/http/openapi.ts`).

## Database

`DATABASE_URL` is validated at start-up. The SQL migrations live in `./drizzle`; `bun run db:migrate` applies
the ones that are missing and is safe to run repeatedly.

### Change the schema

Edit `src/db/schema.ts`, then:

```bash
bun run db:generate --name short_description   # writes a new SQL file into ./drizzle
bun run db:migrate
```

Commit the generated SQL. Never edit an SQL file that is already merged.

## Layout

```
src/index.ts          start-up (config -> database -> server)
src/config.ts         environment variables, validated once; a bad value stops the server at start
src/app.ts            the Elysia app (CORS, OpenAPI, error handling, routes)
src/errors.ts         AppError and the error codes with their HTTP status
src/http/             HTTP plumbing shared by all routes
src/db/               schema (Drizzle tables), client, migration runner
src/booking/          the booking engine: time zones and slots, capacity maths, status rules
drizzle/              generated SQL migrations (committed)
test/                 tests
```

## Conventions

- Every route is under `/api/v1`. The only exception is `GET /health`, which Docker and compose use as a health check.
- Every failure is returned as `{ "error": { "code", "message", "details" } }`, whatever raised it.
- Successful responses are `{ "data": ... }`.
