-- Company-wide HR document repository backed by Supabase Storage + metadata table.

CREATE TABLE IF NOT EXISTS public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Policy', 'Letter Template', 'Form', 'Other')),
  description text,
  storage_path text NOT NULL,
  file_type text,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES public.employees(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_documents_uploaded_at_idx
  ON public.company_documents (uploaded_at DESC);

ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_documents_select_authenticated
  ON public.company_documents
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY company_documents_insert_managers
  ON public.company_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_work_modules());

CREATE POLICY company_documents_update_managers
  ON public.company_documents
  FOR UPDATE TO authenticated
  USING (public.can_manage_work_modules())
  WITH CHECK (public.can_manage_work_modules());

CREATE POLICY company_documents_delete_managers
  ON public.company_documents
  FOR DELETE TO authenticated
  USING (public.can_manage_work_modules());

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-documents', 'company-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "company documents are viewable by authenticated users"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'company-documents');

CREATE POLICY "managers can upload company documents"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-documents'
    AND public.can_manage_work_modules()
  );

CREATE POLICY "managers can update company documents"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND public.can_manage_work_modules()
  )
  WITH CHECK (
    bucket_id = 'company-documents'
    AND public.can_manage_work_modules()
  );

CREATE POLICY "managers can delete company documents"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND public.can_manage_work_modules()
  );
