# BookFlow backend

Bun + ElysiaJS + Zod. The database layer is added in the following changes. Tests: Jest. API documentation: OpenAPI 3 (Scalar page).

## Run it

```bash
bun install
cp .env.example .env        # Bun loads .env automatically
bun run dev                 # http://localhost:8000/health   and   /api/v1/openapi
```

## Check it

```bash
bun run typecheck
bun run test
```

## API documentation (OpenAPI)

With the server running:

- `http://localhost:8000/api/v1/openapi` is the interactive page (Scalar). It needs internet for its script.
- `http://localhost:8000/api/v1/openapi/json` is the OpenAPI 3 document itself, for Postman or code generators.

The document is built from the routes. Describe every new route with `detail: { tags, summary, description }` and
`response: { 200: ..., 4xx: errorResponse }` (see `GET /health` in `src/app.ts` and `src/http/openapi.ts`).

## Layout

```
src/index.ts          start-up (config -> server)
src/config.ts         environment variables, validated once; a bad value stops the server at start
src/app.ts            the Elysia app (CORS, OpenAPI, error handling, routes)
src/errors.ts         AppError and the error codes with their HTTP status
src/http/             HTTP plumbing shared by all routes
test/                 tests
```

## Conventions

- Every route is under `/api/v1`. The only exception is `GET /health`, which Docker and compose use as a health check.
- Every failure is returned as `{ "error": { "code", "message", "details" } }`, whatever raised it.
- Successful responses are `{ "data": ... }`.
