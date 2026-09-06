# Deploying to Railway

The repo is a monorepo with two deployable services (`backend/`, `frontend/`)
plus a managed PostgreSQL database. Each service directory has a `railway.json`
and a `Dockerfile`, so Railway builds them without extra configuration.

## 1. Create the project and database

1. Create a new project on [railway.app](https://railway.app) from this GitHub
   repo.
2. Add a **PostgreSQL** database to the project (New → Database → PostgreSQL).

## 2. Backend service

1. New → GitHub Repo → this repo. Set **Root Directory** to `backend`.
2. Variables:
   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the DB service) |
   | `JWT_SECRET` | a long random string |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CORS_ORIGIN` | the frontend URL (fill in after step 3) |
3. `railway.json` already sets the start command
   (`npx prisma migrate deploy && node dist/main.js`) and the `/api/health`
   healthcheck.
4. Generate a domain for the service (Settings → Networking → Generate Domain).
   Note it as `https://<backend>.up.railway.app`.

## 3. Frontend service

1. New → GitHub Repo → this repo. Set **Root Directory** to `frontend`.
2. Variables:
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | `https://<backend>.up.railway.app/api` |
3. Railway passes service variables as Docker build args, so
   `NEXT_PUBLIC_API_URL` is baked into the Next.js build.
4. Generate a domain: `https://<frontend>.up.railway.app`.

## 4. Wire CORS

Set the backend's `CORS_ORIGIN` to `https://<frontend>.up.railway.app` and
redeploy the backend.

## 5. Seed (optional)

From the backend service shell (Railway → backend → ⋯ → Shell):

```bash
npx prisma db seed
```

Demo logins: `alice@example.com` / `bob@example.com`, password `password123`.

## Redeploys

Every push to the default branch triggers a rebuild of both services.
`prisma migrate deploy` runs on each backend boot, applying any new migrations.
