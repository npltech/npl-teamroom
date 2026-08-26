CREATE TYPE "public"."leave_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('Casual', 'Sick', 'Annual', 'Other');--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type" "leave_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" "leave_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "leave_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_decided_by_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_manager_of(target_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles caller
    JOIN public.employees target ON target.manager_id = caller.employee_id
    WHERE caller.id = auth.uid()
      AND caller.role = 'MANAGER'
      AND target.id = target_employee_id
  );
$$;--> statement-breakpoint
CREATE POLICY "leave_select_own_or_manager_or_admin" ON "leave_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.employee_id = "leave_requests"."employee_id"
        )
        or public.is_manager_of("leave_requests"."employee_id")
        or exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
)
      ));--> statement-breakpoint
CREATE POLICY "leave_insert_self_manager_or_admin" ON "leave_requests" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.employee_id = "leave_requests"."employee_id"
        )
        or public.is_manager_of("leave_requests"."employee_id")
        or exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
)
      ));--> statement-breakpoint
CREATE POLICY "leave_update_manager_or_admin_only" ON "leave_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_manager_of("leave_requests"."employee_id") or exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
)) WITH CHECK (public.is_manager_of("leave_requests"."employee_id") or exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
));