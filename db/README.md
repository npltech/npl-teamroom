# db — Drizzle schema for Supabase

Manages the Postgres schema (tables + RLS policies) for the shared Supabase
database, using [Drizzle ORM](https://orm.drizzle.team) purely as a **schema
and migration tool** — nothing here runs at request time. The web app and
(later) the Flutter app both keep talking to Supabase directly via
`supabase-js` / `supabase_flutter`, exactly as the architecture in the root
README describes. There is no API server in front of the database.

## Setup

```bash
cd db
npm install
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to your Supabase project's **direct**
Postgres connection string (Project Settings → Database → Connection string
→ "URI", port `5432`, not the `6543` pooler — migrations need a direct
connection).

## Apply the schema

```bash
npm run db:migrate
```

This runs the SQL files in `migrations/` in order against your database:

- `0000_*.sql` — generated from `src/schema.ts`: the `departments`,
  `designations`, `employees`, `profiles` tables, their enums/indexes/FKs,
  and every RLS policy.
- `0001_auth_profile_trigger.sql` — hand-written (Drizzle can't declare
  triggers on Supabase's `auth.users`): auto-creates a `profiles` row with
  `role = EMPLOYEE` whenever someone signs up.

## Load demo data (optional)

```bash
npm run db:seed
```

Inserts the same departments/designations/employees your web app currently
shows from `localStorage`, so the app looks identical once it's pointed at
Supabase.

## Making schema changes later

1. Edit `src/schema.ts`.
2. `npm run db:generate` — Drizzle diffs your schema against the last
   migration and writes a new SQL file in `migrations/`.
3. Review the generated SQL, then `npm run db:migrate` to apply it.

For quick local iteration only (skips the migration history — don't use
this against a database anyone else depends on): `npm run db:push`.

## Inspect your data

```bash
npm run db:studio
```

Opens Drizzle Studio, a browser GUI for browsing/editing rows — handy as an
alternative to the Supabase Table Editor.
