ALTER TABLE "designations" ADD COLUMN "department_id" uuid;
--> statement-breakpoint
UPDATE "designations"
SET "department_id" = CASE "name"
  WHEN 'Software Engineer' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Engineering')
  WHEN 'Senior Software Engineer' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Engineering')
  WHEN 'Engineering Manager' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Engineering')
  WHEN 'Sales Executive' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Sales')
  WHEN 'Sales Manager' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Sales')
  WHEN 'HR Executive' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Human Resources')
  WHEN 'HR Manager' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Human Resources')
  WHEN 'Finance Analyst' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Finance')
  WHEN 'Marketing Executive' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Marketing')
  WHEN 'Product Designer' THEN (SELECT "id" FROM "departments" WHERE "name" = 'Design')
  ELSE NULL
END
WHERE "department_id" IS NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "designations" WHERE "department_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make designations.department_id required: unmapped designation rows remain';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "designations" ALTER COLUMN "department_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "designations" DROP CONSTRAINT IF EXISTS "designations_name_unique";
--> statement-breakpoint
ALTER TABLE "designations" ADD CONSTRAINT "designations_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "designations_department_id_idx" ON "designations" USING btree ("department_id");
