CREATE POLICY "employees_update_self" ON "employees" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.employee_id = "employees"."id"
      )) WITH CHECK (exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.employee_id = "employees"."id"
      ));