# Employee Management System — HR Portal POC (Level 1)

A unified HR platform covering the employee lifecycle: recruitment → onboarding →
employee management → attendance → leave → tasks → HR documents.

## Architecture

Two client apps share one PostgreSQL database (via Supabase):

```
                     EMPLOYEE MANAGEMENT SYSTEM
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
           WEB APP                           FLUTTER APP
               │                                 │
               ▼                                 ▼
           FastAPI                           Supabase
               │                         ┌───────┼────────┐
               │                         ▼       ▼        ▼
               │                       Auth   Database  Storage
               │                                 │
               └────────────────┬────────────────┘
                                ▼
                         Supabase PostgreSQL
```

- **Web app** (all 4 roles: Super Admin, HR, Manager, Employee) talks to **FastAPI**,
  which owns complex business logic and the `/api/v1` surface.
- **Flutter app** (Employee + Manager only) talks to **Supabase directly** for
  auth and straightforward CRUD — it does not need FastAPI to log in.
- Both apps read/write the **same PostgreSQL database**, so there's no data
  duplication between web and mobile.

## Repository layout

```
employee_management_system/
│
├── backend/    → FastAPI + SQLAlchemy + Alembic (web app backend & business APIs)
├── web/        → React (Vite + TypeScript + Tailwind v4) — all 4 roles
├── mobile/     → Flutter (Employee + Manager)
├── supabase/   → Supabase config, SQL migrations, RLS policies, storage buckets
├── docs/       → Architecture notes, ERDs, API contracts
└── README.md
```

## Status

| Phase | Area | Status |
|---|---|---|
| 1 | Project foundation & architecture | ✅ Scaffolded (this commit) |
| 2 | Auth, RBAC & Super Admin | ⏳ Next |
| 3 | Employee management | ⏳ |
| 4 | Recruitment & CV management | ⏳ |
| 5 | Employee onboarding | ⏳ |
| 6 | Attendance management | ⏳ |
| 7 | Leave management | ⏳ |
| 8 | Task management | ⏳ |
| 9 | HR document management | ⏳ |
| 10 | Dashboards & reporting | ✅ Static demo in `web/` |
| 11 | Web application | 🟡 Shell + login + role-aware dashboard built |
| 12 | Flutter application | ⏳ |
| 13 | Backend/API architecture | ⏳ |

## Web app — what's built

`web/` is a Vite + React + TypeScript app with:

- A design system in `web/src/index.css` (colour tokens, type scale, radii) —
  see `web/DESIGN.md` for the rationale.
- `LoginPage` with demo role quick-fill (no backend wired yet).
- `AppShell` — sidebar + topbar shell, role-aware navigation driven by
  `web/src/data/roles.ts` (mirrors the Phase 11 nav tree exactly).
- `DashboardPage` — a distinct dashboard view per role (Super Admin, HR,
  Manager, Employee), matching the Phase 10 dashboard spec.
- Reusable ledger components (`StatCard`, `LedgerPanel`, `LedgerRow`,
  `StatusTag`) and the signature `RosterStrip` timeline component.

Run it:

```bash
cd web
npm install
npm run dev
```

Then open the app and click any of the four demo-role buttons on the login
screen to preview that role's dashboard (you can also switch roles live from
the topbar once inside).

## Next steps

1. Wire `backend/` (FastAPI + SQLAlchemy + Alembic) per Phase 1 §Technologies.
2. Set up the Supabase project (Postgres, Auth, Storage buckets, RLS) per
   Phase 1 §2, and point `web/` at real auth instead of the `localStorage`
   demo role.
3. Build out the remaining modules (Employees, Recruitment, Onboarding,
   Attendance, Leave, Tasks, Documents) as real pages behind the nav items
   that currently render the "Not built yet" placeholder.
