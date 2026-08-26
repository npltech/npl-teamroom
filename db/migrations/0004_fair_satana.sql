CREATE TYPE "public"."holiday_category" AS ENUM('National Holiday', 'Optional Holiday', 'Company Holiday', 'Announcement');--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"category" "holiday_category" NOT NULL,
	"description" text,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holidays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "holidays_select_authenticated" ON "holidays" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "holidays_write_admin_hr" ON "holidays" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
)) WITH CHECK (exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN', 'HR')
));