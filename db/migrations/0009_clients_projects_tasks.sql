-- Clients, projects, project membership, tasks, time logs, and comments.
-- This migration intentionally does not alter existing employee, attendance, or leave tables.

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  notes text,
  source text CHECK (source IN ('Upwork', 'Fiverr', 'LinkedIn', 'Referral', 'Website', 'Direct', 'Other')),
  type text NOT NULL CHECK (type IN ('Internal', 'External')),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  start_date date,
  deadline date,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold', 'Completed')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, employee_id)
);

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Completed')),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  assigned_to uuid REFERENCES public.employees(id),
  assigned_by uuid REFERENCES public.employees(id),
  estimated_hours numeric DEFAULT 0,
  logged_hours numeric DEFAULT 0,
  due_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.task_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  logged_by uuid REFERENCES public.employees(id),
  hours numeric NOT NULL,
  logged_at timestamptz DEFAULT now()
);

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.employees(id),
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX projects_client_id_idx ON public.projects(client_id);
CREATE INDEX project_members_employee_id_idx ON public.project_members(employee_id);
CREATE INDEX tasks_project_id_idx ON public.tasks(project_id);
CREATE INDEX tasks_assigned_to_idx ON public.tasks(assigned_to);
CREATE INDEX task_time_logs_task_id_idx ON public.task_time_logs(task_id);
CREATE INDEX task_comments_task_id_idx ON public.task_comments(task_id);

-- SECURITY DEFINER avoids recursive reads through profiles RLS while keeping
-- callers restricted to the authenticated role in the policies below.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role::text FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.employee_id FROM public.profiles p WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_manage_work_modules()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() IN ('SUPER_ADMIN', 'HR', 'MANAGER');
$$;

CREATE OR REPLACE FUNCTION public.can_update_assigned_task(target_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = target_task_id
      AND t.assigned_to = public.current_employee_id()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.current_app_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_employee_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_manage_work_modules() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_update_assigned_task(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_work_modules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_update_assigned_task(uuid) TO authenticated;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_select_authenticated ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY clients_write_managers ON public.clients
  FOR ALL TO authenticated
  USING (public.can_manage_work_modules())
  WITH CHECK (public.can_manage_work_modules());

CREATE POLICY projects_select_authenticated ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY projects_write_managers ON public.projects
  FOR ALL TO authenticated
  USING (public.can_manage_work_modules())
  WITH CHECK (public.can_manage_work_modules());

CREATE POLICY project_members_select_authenticated ON public.project_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY project_members_write_managers ON public.project_members
  FOR ALL TO authenticated
  USING (public.can_manage_work_modules())
  WITH CHECK (public.can_manage_work_modules());

CREATE POLICY tasks_select_authenticated ON public.tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY tasks_insert_managers ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_work_modules());
CREATE POLICY tasks_update_managers ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.can_manage_work_modules())
  WITH CHECK (public.can_manage_work_modules());
CREATE POLICY tasks_update_assigned_employee ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.can_update_assigned_task(id))
  WITH CHECK (public.can_update_assigned_task(id));
CREATE POLICY tasks_delete_managers ON public.tasks
  FOR DELETE TO authenticated
  USING (public.can_manage_work_modules());

CREATE POLICY task_time_logs_select_authenticated ON public.task_time_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY task_time_logs_insert_own ON public.task_time_logs
  FOR INSERT TO authenticated
  WITH CHECK (logged_by = public.current_employee_id());

CREATE POLICY task_comments_select_authenticated ON public.task_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY task_comments_insert_own ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = public.current_employee_id());

-- Employees may change only status and logged_hours on their assigned tasks.
-- The rollup trigger below owns logged_hours after a time-log insert/delete.
CREATE OR REPLACE FUNCTION public.enforce_assigned_task_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.can_manage_work_modules() THEN
    RETURN NEW;
  END IF;

  IF public.current_app_role() = 'EMPLOYEE'
     AND OLD.assigned_to = public.current_employee_id()
     AND NEW.id = OLD.id
     AND NEW.project_id IS NOT DISTINCT FROM OLD.project_id
     AND NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.description IS NOT DISTINCT FROM OLD.description
     AND NEW.priority IS NOT DISTINCT FROM OLD.priority
     AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to
     AND NEW.assigned_by IS NOT DISTINCT FROM OLD.assigned_by
     AND NEW.estimated_hours IS NOT DISTINCT FROM OLD.estimated_hours
     AND NEW.due_date IS NOT DISTINCT FROM OLD.due_date
     AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Employees may update only status and logged_hours on their assigned tasks';
END;
$$;

CREATE TRIGGER enforce_assigned_task_update_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assigned_task_update();

CREATE OR REPLACE FUNCTION public.refresh_task_logged_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_task_id uuid;
BEGIN
  affected_task_id := COALESCE(NEW.task_id, OLD.task_id);
  UPDATE public.tasks
  SET logged_hours = COALESCE((
    SELECT SUM(hours) FROM public.task_time_logs WHERE task_id = affected_task_id
  ), 0)
  WHERE id = affected_task_id;
  IF TG_OP = 'UPDATE' AND NEW.task_id IS DISTINCT FROM OLD.task_id THEN
    UPDATE public.tasks
    SET logged_hours = COALESCE((
      SELECT SUM(hours) FROM public.task_time_logs WHERE task_id = OLD.task_id
    ), 0)
    WHERE id = OLD.task_id;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER refresh_task_logged_hours_after_log
  AFTER INSERT OR UPDATE OR DELETE ON public.task_time_logs
  FOR EACH ROW EXECUTE FUNCTION public.refresh_task_logged_hours();

INSERT INTO public.clients (name, type, status)
SELECT 'Northern Planet', 'Internal', 'Active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.clients WHERE name = 'Northern Planet'
);
