import { useCallback, useEffect, useState } from 'react';

export type DocumentCategory = 'ID Proof' | 'Education' | 'Bank Details' | 'Certificate' | 'Other';

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  name: string;
  category: DocumentCategory;
  uploaded_at: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'roster.employee_documents';

function load(): EmployeeDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EmployeeDocument[]) : [];
  } catch {
    return [];
  }
}

export function useEmployeeDocuments(employeeId: string | null) {
  const [all, setAll] = useState<EmployeeDocument[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }, [all]);

  const documents = employeeId ? all.filter((d) => d.employee_id === employeeId) : [];

  const addDocument = useCallback(
    (payload: { name: string; category: DocumentCategory }) => {
      if (!employeeId) return;
      setAll((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          uploaded_at: new Date().toISOString().slice(0, 10),
          ...payload,
        },
      ]);
    },
    [employeeId],
  );

  const removeDocument = useCallback((id: string) => {
    setAll((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { documents, addDocument, removeDocument };
}
