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

The tests refuse to run against a database whose name does not contain `test`. From this change on they also delete every row from every table before each test, so `.env.test` must only ever point at a throwaway database.

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

## Accounts and sessions

| Route | Who | What it does |
| --- | --- | --- |
| `POST /api/v1/auth/register` | anyone | creates a `CUSTOMER` or `BUSINESS_OWNER` account (`ADMIN` is refused) |
| `POST /api/v1/auth/login` | anyone | checks the e-mail and password and sets the session cookie |
| `POST /api/v1/auth/logout` | logged in | deletes the session and clears the cookie |
| `GET /api/v1/auth/me` | logged in | returns the current user |

Passwords are hashed with Argon2id (19 MiB of memory, 2 passes, 1 lane). Every password gets its own random 16 byte
salt, and the salt and the settings are stored in the same string as the hash (`$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`),
so two users with the same password have different values and nothing else has to be stored. The password is normalised
(Unicode NFKC) before hashing. If the settings in `src/auth/password.ts` are changed later, a user's old hash is replaced
by one with the new settings the next time they log in. A login for an e-mail that does not exist still does a full
hash check, and a wrong password and an unknown e-mail give the same answer.

The session cookie (`bookflow_session`) holds a random 256-bit token. Only its SHA-256 is stored in the `sessions` table, so a
copy of the database cannot be used to log in. The cookie is `HttpOnly` and `SameSite=Lax`, it lasts `SESSION_TTL_DAYS`
(14 by default) and gets `Secure` when `COOKIE_SECURE=true` (set that behind HTTPS).

### Limits on attempts

Hashing is slow on purpose, so guessing passwords and flooding the sign-up are limited:

| What | Limit | Counted per |
| --- | --- | --- |
| wrong passwords for one e-mail | 5 in 15 minutes | address and e-mail |
| wrong passwords from one address | 30 in 15 minutes | address |
| registrations | 20 per hour | address |

Over the limit the API answers `429` with `{ "error": { "code": "TOO_MANY_ATTEMPTS", "details": { "retryAfterSeconds": n } } }`
and a `Retry-After` header, without doing any hashing. A correct login clears the count for that e-mail and does not use up the
address budget, a request refused as invalid (422) is not counted, and an unknown e-mail is counted exactly like a known one.
The key contains the address, so a stranger cannot lock the real owner of an e-mail out from somewhere else.

The address is the one of the connection. Behind a reverse proxy every visitor would look the same, so set `TRUST_PROXY=true`
and the last entry of `X-Forwarded-For` (the one the proxy added) is used instead. Leave it `false` when nothing sits in
front of the API, because the header can be forged by the client. The counters are kept in the memory of the process: they
reset when the server restarts, and with several server instances each one counts for itself.

## Layout

```
src/index.ts          start-up (config -> database -> server)
src/config.ts         environment variables, validated once; a bad value stops the server at start
src/app.ts            the Elysia app (CORS, OpenAPI, error handling, routes)
src/errors.ts         AppError and the error codes with their HTTP status
src/auth/             passwords (Argon2id), sessions, the /auth routes
src/http/             HTTP plumbing shared by all routes
src/db/               schema (Drizzle tables), client, migration runner
drizzle/              generated SQL migrations (committed)
test/                 tests
```

## Conventions

- Every route is under `/api/v1`. The only exception is `GET /health`, which Docker and compose use as a health check.
- Every failure is returned as `{ "error": { "code", "message", "details" } }`, whatever raised it.
- Successful responses are `{ "data": ... }`.
