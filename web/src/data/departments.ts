import { useCallback, useEffect, useState } from 'react';

export interface Department {
  id: string;
  name: string;
}

const STORAGE_KEY = 'roster.departments';

const SEED_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Engineering' },
  { id: 'd2', name: 'Sales' },
  { id: 'd3', name: 'Finance' },
  { id: 'd4', name: 'Marketing' },
  { id: 'd5', name: 'Human Resources' },
  { id: 'd6', name: 'Design' },
  { id: 'd7', name: 'Operations' },
];

function load(): Department[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DEPARTMENTS));
      return SEED_DEPARTMENTS;
    }
    return JSON.parse(raw) as Department[];
  } catch {
    return SEED_DEPARTMENTS;
  }
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(departments));
  }, [departments]);

  const addDepartment = useCallback((name: string) => {
    setDepartments((prev) => [...prev, { id: crypto.randomUUID(), name }]);
  }, []);

  const removeDepartment = useCallback((id: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { departments, addDepartment, removeDepartment };
}
