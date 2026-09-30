# StockDesk

Inventory &amp; Order Management API for a small retail shop. Node.js + Express, PostgreSQL, server-rendered EJS UI, Swagger docs.

## Prerequisites

- Node.js 18+
- Docker (for running PostgreSQL locally)
- `psql` CLI installed (used by the table-creation script)

## 1. Clone

```bash
git clone <your-repo-url>
cd StockDesk
```

## 2. Install dependencies

```bash
npm i
```

## 3. Configure environment

Copy `.env.example` to `.env` and fill in your own values:

```env
PORT=8000
ENV=Development
DATABASE_USERNAME=postgres
DATABASE_HOST=localhost
DATABASE_NAME=stockdesk-db
DATABASE_PASSWORD=your_secure_password
JWT_SECRET=JIBRESHgfdkjsdkj
```

The app fails loudly on startup if `DATABASE_*` values or `JWT_SECRET` are missing — this is intentional, not a bug.

## 4. Start PostgreSQL (Docker)

Run Postgres using the same credentials as your `.env`:

```bash
docker run --name stockdesk-db \
  -e POSTGRES_USER=$DATABASE_USERNAME \
  -e POSTGRES_PASSWORD=$DATABASE_PASSWORD \
  -e POSTGRES_DB=$DATABASE_NAME \
  -p 5432:5432 \
  -d postgres:16
```

(Or just hardcode the values from your `.env` directly in the command if you're not exporting them into your shell.)

## 5. Create tables and seed data

Create the schema:
<!-- 
```bash
bash scripts/migrate.sh
``` -->
```bash
npm run migrate
```

This runs `schema.sql` against your DB using the credentials in `.env`. It's safe to re-run.

Then seed sample data (5 categories, 50 products, 10 customers, 20 orders, 2 users):

```bash
npm run seed
```

This gives you two ready-to-use logins:

| Role  | Email               | Password    |
| ----- | ------------------- | ----------- |
| ADMIN | admin@stockdesk.dev | Password123 |
| STAFF | staff@stockdesk.dev | Password123 |

## 6. Run the app

```bash
npm run dev
```

Server starts on `http://localhost:8000` (or whatever `PORT` you set).

## Using the app

- **UI**: `http://localhost:8000/login` — log in with either seeded account above.
- **Swagger**: `http://localhost:8000/api-docs` — every endpoint documented, including request/response shapes and error codes. Click **Authorize** and paste a JWT (from `POST /api/auth/login`) to test authenticated routes directly from the browser.
- **API base URL**: `http://localhost:8000/api`

## Scripts reference

| Command                         | What it does                                         |
| ------------------------------- | -----------------------------------------------------|
| `npm run dev`                   | Starts the server with `node --watch index.js`       |
| `npm run seed`                  | Populates the DB with sample data                    |
| `npm run migrate`               | Creates all tables/indexes from `scripts/schema.sql` |
