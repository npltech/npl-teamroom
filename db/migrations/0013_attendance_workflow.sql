-- Extend attendance sessions with UTC timestamps and approval workflow fields.

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS check_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS check_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_check_in time,
  ADD COLUMN IF NOT EXISTS original_check_out time,
  ADD COLUMN IF NOT EXISTS manual_approval_status text NOT NULL DEFAULT 'approved'
    CHECK (manual_approval_status IN ('approved', 'pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS work_done_today text,
  ADD COLUMN IF NOT EXISTS is_overtime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_attendance_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.check_in_at IS NULL AND NEW.check_in IS NOT NULL THEN
    NEW.check_in_at := (NEW.date + NEW.check_in) AT TIME ZONE current_setting('TIMEZONE');
  END IF;
  IF NEW.check_out_at IS NULL AND NEW.check_out IS NOT NULL THEN
    NEW.check_out_at := (NEW.date + NEW.check_out) AT TIME ZONE current_setting('TIMEZONE');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_attendance_timestamps_trigger ON public.attendance;
CREATE TRIGGER set_attendance_timestamps_trigger
  BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_attendance_timestamps();

UPDATE public.attendance
SET original_check_in = COALESCE(original_check_in, check_in),
    original_check_out = COALESCE(original_check_out, check_out),
    updated_at = COALESCE(updated_at, created_at)
WHERE original_check_in IS NULL OR original_check_out IS NULL;

CREATE INDEX IF NOT EXISTS attendance_manual_status_idx
  ON public.attendance (manual_approval_status);
CREATE INDEX IF NOT EXISTS attendance_overtime_status_idx
  ON public.attendance (overtime_approval_status);

REVOKE EXECUTE ON FUNCTION public.set_attendance_timestamps() FROM PUBLIC;
