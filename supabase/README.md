# Supabase

Not yet provisioned. Per Phase 1 §2 of the project spec, this project needs:

- A Supabase project with PostgreSQL, Auth, and Storage enabled.
- Row Level Security (RLS) policies per table, scoped by role
  (`SUPER_ADMIN` / `HR` / `MANAGER` / `EMPLOYEE`) and by ownership
  (e.g. an employee can read their own attendance/leave rows; a manager
  can read their team's).
- Storage buckets: `resumes/`, `employee-documents/`, `hr-documents/`,
  `offer-letters/`.

Suggested layout once provisioned:
```
supabase/
├── migrations/       -- SQL migrations (schema, RLS policies)
├── seed.sql          -- demo/reference data
└── config.toml        -- Supabase CLI config
```
