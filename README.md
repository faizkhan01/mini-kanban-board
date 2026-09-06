# Mini Kanban Board

A collaborative Kanban board: users register, create boards, share them with
other registered users at different permission levels, and organize work into
columns and draggable task cards.

- **Frontend** — Next.js 14 (App Router), React, TypeScript, Tailwind CSS,
  `@hello-pangea/dnd` for drag-and-drop.
- **Backend** — NestJS 10, Prisma 5, PostgreSQL, JWT auth.
- **DevOps** — `docker-compose.yml` brings up the database, API, and web app.

```
mini-kanban-board/
├── backend/     NestJS + Prisma API
├── frontend/    Next.js web client
└── docker-compose.yml
```

---

## Quick start with Docker (recommended)

Requires Docker + Docker Compose.

```bash
git clone <this-repo>
cd mini-kanban-board
docker compose up --build
```

- Web app: http://localhost:3000
- API: http://localhost:4000/api
- PostgreSQL: `localhost:5433` (user/pass/db all `kanban`)

The API container runs `prisma migrate deploy` on startup, so the schema is
created automatically. To load demo data (two users and a sample board):

```bash
docker compose exec backend npx prisma db seed
```

Demo logins (password `password123`): `alice@example.com`, `bob@example.com`.

---

## Local development (without Docker for the apps)

You still need a PostgreSQL instance. The easiest way is to run just the DB
container:

```bash
docker compose up -d db     # Postgres on localhost:5433
```

### Backend

```bash
cd backend
cp .env.example .env         # defaults already point at localhost:5433
npm install
npx prisma migrate dev       # create schema
npm run db:seed              # optional demo data
npm run start:dev            # http://localhost:4000/api
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                  # http://localhost:3000
```

---

## Environment variables

### `backend/.env`

| Variable         | Default                                                              | Purpose                             |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------- |
| `DATABASE_URL`   | `postgresql://kanban:kanban@localhost:5433/kanban?schema=public`    | Prisma connection string            |
| `PORT`           | `4000`                                                              | API port                            |
| `JWT_SECRET`     | _(set me)_                                                          | Signing secret for access tokens    |
| `JWT_EXPIRES_IN` | `7d`                                                                | Token lifetime                      |
| `CORS_ORIGIN`    | `http://localhost:3000`                                             | Comma-separated allowed origins     |

### `frontend/.env.local`

| Variable              | Default                       | Purpose               |
| --------------------- | ----------------------------- | --------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api`   | Base URL of the API   |

---

## Data model

| Entity          | Notes                                                                         |
| --------------- | ---------------------------------------------------------------------------- |
| **User**        | `email` (unique), `name`, `passwordHash` (bcrypt).                          |
| **Board**       | Has one `owner`. Cascade-deletes its columns, tasks, and member rows.        |
| **BoardMember** | `(boardId, userId)` unique. `role` ∈ `EDITOR` \| `VIEWER`.                   |
| **Column**      | Belongs to a board. `(boardId, position)` unique — gap-free 0-based order.   |
| **Task**        | Belongs to a column (and denormalized `boardId`). `(columnId, position)` unique. |

### Ordering & the Task Movement API

`position` is a **contiguous 0-based integer sequence** maintained per parent.
Every structural change (create, delete, reorder, move) runs inside a
transaction that rewrites the affected sequence in two passes — first into a
scratch integer range, then to final values — so the `(parent, position)`
unique constraint is never violated on an intermediate row and the order stays
gap-free.

`PATCH /api/tasks/:id/move` with `{ "columnId", "position" }` handles both:

- **Reorder within a column** — `columnId` equals the task's current column.
- **Move across columns** — `columnId` is another column _on the same board_
  (cross-board moves are rejected with `400`). The task lands at `position`,
  the source column is compacted, and the destination column is re-sequenced.

The move transaction runs at **Serializable** isolation so concurrent moves on
the same board cannot interleave into an inconsistent order.

---

## Authentication & access control

- `POST /api/auth/register` and `POST /api/auth/login` return
  `{ user, accessToken }`. The client stores the JWT in `localStorage` and
  sends it as `Authorization: Bearer <token>`.
- Every other route is guarded by default (global `JwtAuthGuard`; `@Public()`
  opts specific routes out).
- Authorization is centralized in `BoardAccessService`. Role ranks:
  `OWNER (3) > EDITOR (2) > VIEWER (1)`.
  - **View** board / columns / tasks → `VIEWER`
  - **Mutate** columns / tasks, rename board → `EDITOR`
  - **Share/unshare, delete board** → `OWNER`
- Requests for a board the user cannot see return **404** (existence is not
  leaked); a visible board with insufficient role returns **403**.
- Columns and tasks are always authorized via their owning board, so there is
  no way to touch another board's data by guessing IDs.

---

## API reference

All routes are prefixed with `/api`. Authenticated routes need
`Authorization: Bearer <token>`.

| Method | Path                                  | Role   | Description                            |
| ------ | ------------------------------------- | ------ | ------------------------------------- |
| GET    | `/health`                             | –      | Liveness probe                         |
| POST   | `/auth/register`                      | –      | Create account, returns token         |
| POST   | `/auth/login`                         | –      | Log in, returns token                 |
| GET    | `/auth/me`                            | user   | Current user                          |
| GET    | `/users/search?q=`                    | user   | Find users to share with              |
| GET    | `/boards`                             | user   | Boards owned by or shared with me     |
| POST   | `/boards`                             | user   | Create board (seeds 3 columns)        |
| GET    | `/boards/:id`                         | VIEWER | Full board: columns + ordered tasks   |
| PATCH  | `/boards/:id`                         | EDITOR | Rename board                          |
| DELETE | `/boards/:id`                         | OWNER  | Delete board                          |
| POST   | `/boards/:id/members`                 | OWNER  | Share with `{ email, role }`          |
| PATCH  | `/boards/:id/members/:userId`         | OWNER  | Change a member's role                |
| DELETE | `/boards/:id/members/:userId`         | OWNER¹ | Remove a member (¹ or self to leave)  |
| POST   | `/boards/:id/columns`                 | EDITOR | Create column (appended)              |
| PATCH  | `/columns/:id`                        | EDITOR | Rename column                         |
| PATCH  | `/columns/:id/reorder`                | EDITOR | Move column to `{ position }`         |
| DELETE | `/columns/:id`                        | EDITOR | Delete column + its tasks             |
| POST   | `/columns/:id/tasks`                  | EDITOR | Create task `{ title, description? }` |
| PATCH  | `/tasks/:id`                          | EDITOR | Update `{ title?, description? }`     |
| PATCH  | `/tasks/:id/move`                     | EDITOR | Move task `{ columnId, position }`    |
| DELETE | `/tasks/:id`                          | EDITOR | Delete task                          |

---

## Frontend

- `/login`, `/register` — token auth, session restored from `localStorage`.
- `/boards` — list of accessible boards with role badges; create a board.
- `/boards/[id]` — the interactive board:
  - Drag task cards within and across columns (disabled for `VIEWER`).
  - Drag columns to reorder them.
  - Inline create/edit/delete for columns and tasks.
  - Owner-only **Share** dialog (add members by email, change role, remove).
  - Task moves update optimistically and roll back on API error.

---

## Tests

```bash
cd backend && npm test
```

Covers the ordering/resequencing logic used by the Task Movement API.

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for step-by-step Railway instructions (two Docker
services plus a managed PostgreSQL database).
