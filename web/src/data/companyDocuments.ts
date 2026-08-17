import { useCallback, useEffect, useState } from 'react';

export type CompanyDocCategory = 'Policy' | 'Letter Template' | 'Form' | 'Other';

export interface CompanyDocument {
  id: string;
  name: string;
  category: CompanyDocCategory;
  description?: string;
  file?: {
    name: string;
    type: string;
    size: number;
  };
  uploaded_at: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'roster.company_documents';

const SEED_DOCS: CompanyDocument[] = [
  { id: 'cd1', name: 'Employee Handbook 2026', category: 'Policy', uploaded_at: '2026-01-05' },
  { id: 'cd2', name: 'Leave Policy', category: 'Policy', uploaded_at: '2026-01-05' },
  { id: 'cd3', name: 'Offer Letter Template', category: 'Letter Template', uploaded_at: '2026-02-10' },
  { id: 'cd4', name: 'Reimbursement Claim Form', category: 'Form', uploaded_at: '2026-03-01' },
  { id: 'cd5', name: 'Code of Conduct', category: 'Policy', uploaded_at: '2026-01-05' },
];

function load(): CompanyDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DOCS));
      return SEED_DOCS;
    }
    return JSON.parse(raw) as CompanyDocument[];
  } catch {
    return SEED_DOCS;
  }
}

export function useCompanyDocuments() {
  const [documents, setDocuments] = useState<CompanyDocument[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  const addDocument = useCallback(
    (payload: { name: string; category: CompanyDocCategory; description?: string; file?: File }) => {
      setDocuments((prev) => [
        {
          id: crypto.randomUUID(),
          uploaded_at: new Date().toISOString().slice(0, 10),
          name: payload.name,
          category: payload.category,
          description: payload.description,
          file: payload.file
            ? {
              name: payload.file.name,
              type: payload.file.type,
              size: payload.file.size,
            }
            : undefined,
        },
        ...prev,
      ]);
    },
    []
  );

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { documents, addDocument, removeDocument };
}
