# bookflow
Web application for appointment booking and management

## Local PostgreSQL

Install Docker with the Compose plugin. Copy `.env.example` to `.env`
(`Copy-Item .env.example .env` in PowerShell) and set a local database password.
Update `DATABASE_URL` to match your credentials and published port.
The `.env` file is ignored by Git.

```sh
docker compose up -d --wait
docker compose ps
docker compose exec db psql -U bookflow -d bookflow -c "SELECT 1;"
```

The SQL example uses the default database and user. Host applications connect to
`127.0.0.1` on `POSTGRES_PORT`. Applications in Compose use `db:5432`.

Run `docker compose down` to stop the database and keep its data. To reset the
local database, run `docker compose down --volumes`, which permanently deletes
its data, and then run `docker compose up -d --wait` again.
