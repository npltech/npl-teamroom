-- Attendance records and immutable corrective-edit audit history.

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in time,
  check_out time,
  latitude double precision,
  longitude double precision,
  work_mode text NOT NULL CHECK (work_mode IN ('OFFICE', 'WFH', 'HYBRID')),
  status text NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT')),
  is_manual_entry boolean NOT NULL DEFAULT false,
  manual_entry_reason text,
  is_early_checkout boolean NOT NULL DEFAULT false,
  early_checkout_reason text,
  overtime_minutes integer NOT NULL DEFAULT 0,
  overtime_reason text,
  overtime_approval_status text CHECK (overtime_approval_status IN ('approved', 'pending', 'rejected')),
  overtime_approved_by uuid REFERENCES public.employees(id),
  mats timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  changed_by text NOT NULL,
  changed_on date NOT NULL DEFAULT current_date,
  previous_check_in time,
  previous_check_out time,
  updated_check_in time,
  updated_check_out time,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attendance_employee_date_idx
  ON public.attendance (employee_id, date);

CREATE INDEX IF NOT EXISTS attendance_date_idx
  ON public.attendance (date);

CREATE OR REPLACE FUNCTION public.set_attendance_mats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.mats := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_future_attendance_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.date > current_date THEN
    RAISE EXCEPTION 'Attendance date cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_attendance_mats_trigger ON public.attendance;
CREATE TRIGGER set_attendance_mats_trigger
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_attendance_mats();

DROP TRIGGER IF EXISTS prevent_future_attendance_date_trigger ON public.attendance;
CREATE TRIGGER prevent_future_attendance_date_trigger
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.prevent_future_attendance_date();

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_select_self
  ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.current_app_role() = 'EMPLOYEE'
    AND employee_id = public.current_employee_id()
  );

CREATE POLICY attendance_select_manager_team
  ON public.attendance
  FOR SELECT TO authenticated
  USING (
    public.current_app_role() = 'MANAGER'
    AND EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = attendance.employee_id
        AND e.manager_id = public.current_employee_id()
    )
  );

CREATE POLICY attendance_select_hr_admin
  ON public.attendance
  FOR SELECT TO authenticated
  USING (public.current_app_role() IN ('HR', 'SUPER_ADMIN'));

CREATE POLICY attendance_insert_self
  ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_role() = 'EMPLOYEE'
    AND employee_id = public.current_employee_id()
  );

CREATE POLICY attendance_insert_hr_admin
  ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('HR', 'SUPER_ADMIN'));

CREATE POLICY attendance_update_self_open
  ON public.attendance
  FOR UPDATE TO authenticated
  USING (
    public.current_app_role() = 'EMPLOYEE'
    AND employee_id = public.current_employee_id()
    AND check_out IS NULL
  )
  WITH CHECK (
    public.current_app_role() = 'EMPLOYEE'
    AND employee_id = public.current_employee_id()
  );

CREATE POLICY attendance_update_hr_admin
  ON public.attendance
  FOR UPDATE TO authenticated
  USING (public.current_app_role() IN ('HR', 'SUPER_ADMIN'))
  WITH CHECK (public.current_app_role() IN ('HR', 'SUPER_ADMIN'));

CREATE POLICY attendance_audit_select_hr_admin
  ON public.attendance_audit
  FOR SELECT TO authenticated
  USING (public.current_app_role() IN ('HR', 'SUPER_ADMIN'));

CREATE POLICY attendance_audit_insert_hr_admin
  ON public.attendance_audit
  FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('HR', 'SUPER_ADMIN'));

REVOKE EXECUTE ON FUNCTION public.set_attendance_mats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_future_attendance_date() FROM PUBLIC;
