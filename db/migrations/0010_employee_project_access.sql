-- Allow authenticated employees to read client/project metadata needed for task details.
-- Managers and admins keep full write access; employees can only read these reference tables.

DROP POLICY IF EXISTS clients_select_managers ON public.clients;
CREATE POLICY clients_select_authenticated ON public.clients
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS projects_select_managers ON public.projects;
CREATE POLICY projects_select_authenticated ON public.projects
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS project_members_select_managers ON public.project_members;
CREATE POLICY project_members_select_authenticated ON public.project_members
  FOR SELECT TO authenticated USING (true);
