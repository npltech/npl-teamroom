import { useCallback, useEffect, useState } from 'react';

export interface Designation {
  id: string;
  name: string;
}

const STORAGE_KEY = 'roster.designations';

const SEED_DESIGNATIONS: Designation[] = [
  { id: 'g1', name: 'Software Engineer' },
  { id: 'g2', name: 'Senior Software Engineer' },
  { id: 'g3', name: 'Engineering Manager' },
  { id: 'g4', name: 'Sales Executive' },
  { id: 'g5', name: 'Sales Manager' },
  { id: 'g6', name: 'HR Executive' },
  { id: 'g7', name: 'HR Manager' },
  { id: 'g8', name: 'Finance Analyst' },
  { id: 'g9', name: 'Marketing Executive' },
  { id: 'g10', name: 'Product Designer' },
];

function load(): Designation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DESIGNATIONS));
      return SEED_DESIGNATIONS;
    }
    return JSON.parse(raw) as Designation[];
  } catch {
    return SEED_DESIGNATIONS;
  }
}

export function useDesignations() {
  const [designations, setDesignations] = useState<Designation[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designations));
  }, [designations]);

  const addDesignation = useCallback((name: string) => {
    setDesignations((prev) => [...prev, { id: crypto.randomUUID(), name }]);
  }, []);

  const removeDesignation = useCallback((id: string) => {
    setDesignations((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { designations, addDesignation, removeDesignation };
}
