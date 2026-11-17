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

The tests use a real PostgreSQL database that is separate from your development one. Create it once, point `.env.test` at it, migrate it, then run the tests:

```bash
docker compose exec db createdb -U bookflow bookflow_test   # once; without Docker: createdb bookflow_test
cp .env.test.example .env.test
bun run db:migrate:test      # applies the migrations to the database named in .env.test
bun run test                 # Jest, test files run one after another
bun run typecheck
```

`bun run db:migrate` reads `.env`, which is your development database. `bun run db:migrate:test` and `bun run test` both read `.env.test`, and what is written there wins over any `DATABASE_URL` you exported in your shell, so the migrations and the tests always use the same `bookflow_test` database. If there is no `.env.test` (as in CI), the `DATABASE_URL` from the environment is used. `bun run db:migrate:test` also refuses, before it connects, any database whose name does not contain `test`, so it can never migrate your development database by accident.

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
drizzle/              generated SQL migrations (committed)
test/                 tests
```

## Conventions

- Every route is under `/api/v1`. The only exception is `GET /health`, which Docker and compose use as a health check.
- Every failure is returned as `{ "error": { "code", "message", "details" } }`, whatever raised it.
- Successful responses are `{ "data": ... }`.
