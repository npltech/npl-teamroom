# Backend — FastAPI

Not yet scaffolded. Per Phase 1/13 of the project spec:

- Python + FastAPI
- SQLAlchemy (ORM)
- Alembic (migrations)
- Connects to the same Supabase PostgreSQL database as the Flutter app
- Owns `/api/v1/*` — auth, users, roles, permissions, departments,
  designations, employees, jobs, candidates, interviews, onboarding,
  attendance, leaves, tasks, documents, dashboard
- Serves the **web app**; the Flutter app talks to Supabase directly for
  simple CRUD/auth and only calls FastAPI for sensitive or complex
  server-side logic.

Planned `.env`:
```
DATABASE_URL=
SECRET_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```
