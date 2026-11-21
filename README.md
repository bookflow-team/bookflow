# bookflow
Web application for appointment booking and management

## Local development with Docker Compose

Install Docker Desktop or Docker Engine with Docker Compose 2.22 or later.
From the repository root, copy `.env.example` to `.env`
(`Copy-Item .env.example .env` in PowerShell) and set a local database password.
Use a URL-safe password or set `COMPOSE_DATABASE_URL` with URL-encoded credentials
and the `db:5432` address.

```sh
docker compose up --build -d --wait
docker compose ps
```

Open `http://localhost:5173` for the frontend. The API runs at
`http://localhost:8000`, and `http://localhost:5173/api/v1/health` goes through
Vite to the API. The health endpoint runs a query against PostgreSQL. The backend
applies the committed migrations before starting. Set `POSTGRES_PORT`,
`BACKEND_PORT`, or `FRONTEND_PORT` in `.env` if a host port is already in use.

To verify the full request path from the host, open `/api/v1/health` on the
frontend URL. A working stack returns `{"data":{"status":"ok"}}`.

For live development, run `docker compose up --build --watch` from the same
directory. Compose syncs source edits, Vite and Bun reload their applications,
and dependency manifest or lockfile changes rebuild the affected image. After
adding a migration, restart the backend with `docker compose restart backend`
to apply pending migrations. `docker compose down` stops the stack and preserves
the database volume.

## Local PostgreSQL

Install Docker with the Compose plugin. Copy `.env.example` to `.env`
(`Copy-Item .env.example .env` in PowerShell) and set a local database password.
Update `DATABASE_URL` to match your credentials and published port.
The `.env` file is ignored by Git.

```sh
docker compose up -d --wait db
docker compose ps db
docker compose exec db psql -U bookflow -d bookflow -c "SELECT 1;"
```

The SQL example uses the default database and user. Host applications connect to
`127.0.0.1` on `POSTGRES_PORT`. Applications in Compose use `db:5432`.

Run `docker compose down` to stop the database and keep its data. To reset the
local database, run `docker compose down --volumes`, which permanently deletes
its data, and then run `docker compose up -d --wait db` again.
