CREATE TYPE "public"."app_role" AS ENUM('SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE');--> statement-breakpoint
CREATE TYPE "public"."employment_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."gender_type" AS ENUM('Male', 'Female', 'Other', 'Prefer not to say');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('OFFICE', 'WFH', 'HYBRID');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "designations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "designations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "designations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_code" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"department_id" uuid,
	"designation_id" uuid,
	"manager_id" uuid,
	"joining_date" date NOT NULL,
	"date_of_birth" date,
	"gender" "gender_type",
	"employment_status" "employment_status" DEFAULT 'ACTIVE' NOT NULL,
	"work_mode" "work_mode" DEFAULT 'OFFICE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "app_role" DEFAULT 'EMPLOYEE' NOT NULL,
	"employee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_designation_id_designations_id_fk" FOREIGN KEY ("designation_id") REFERENCES "public"."designations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employees_department_id_idx" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "employees_designation_id_idx" ON "employees" USING btree ("designation_id");--> statement-breakpoint
CREATE INDEX "employees_manager_id_idx" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "profiles_employee_id_idx" ON "profiles" USING btree ("employee_id");--> statement-breakpoint
CREATE POLICY "departments_select_authenticated" ON "departments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "departments_write_admin_hr" ON "departments" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
)) WITH CHECK (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
));--> statement-breakpoint
CREATE POLICY "designations_select_authenticated" ON "designations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "designations_write_admin_hr" ON "designations" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
)) WITH CHECK (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
));--> statement-breakpoint
CREATE POLICY "employees_all_admin_hr" ON "employees" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
)) WITH CHECK (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
));--> statement-breakpoint
CREATE POLICY "employees_select_manager_team" ON "employees" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role = 'MANAGER'
          and ("employees"."manager_id" = p.employee_id or "employees"."id" = p.employee_id)
      ));--> statement-breakpoint
CREATE POLICY "employees_select_self" ON "employees" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role = 'EMPLOYEE'
          and "employees"."id" = p.employee_id
      ));--> statement-breakpoint
CREATE POLICY "profiles_all_admin_hr" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
)) WITH CHECK (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
));--> statement-breakpoint
CREATE POLICY "profiles_select_self" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_update_self" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("profiles"."id" = auth.uid()) WITH CHECK ("profiles"."id" = auth.uid());