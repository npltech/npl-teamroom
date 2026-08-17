import { useCallback, useEffect, useState } from 'react';

export type WorkMode = 'OFFICE' | 'WFH' | 'HYBRID';
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE';

export interface Employee {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  phone: string;
  department_id: string;
  designation_id: string;
  manager_id: string | null;
  joining_date: string; // YYYY-MM-DD
  employment_status: EmploymentStatus;
  work_mode: WorkMode;
}

const STORAGE_KEY = 'roster.employees';

// Names reused from the dashboard ledger widgets so the app feels like one
// coherent dataset rather than disconnected demo content on every screen.
const SEED_EMPLOYEES: Employee[] = [
  { id: 'e1', employee_code: 'EMP-1001', name: 'Kabir Shah', email: 'kabir.shah@roster.io', phone: '+91 98200 11221', department_id: 'd2', designation_id: 'g5', manager_id: null, joining_date: '2021-03-01', employment_status: 'ACTIVE', work_mode: 'OFFICE' },
  { id: 'e2', employee_code: 'EMP-1002', name: 'Meera Nair', email: 'meera.nair@roster.io', phone: '+91 98200 11222', department_id: 'd3', designation_id: 'g8', manager_id: null, joining_date: '2020-07-14', employment_status: 'ACTIVE', work_mode: 'HYBRID' },
  { id: 'e3', employee_code: 'EMP-1003', name: 'Arjun Sinha', email: 'arjun.sinha@roster.io', phone: '+91 98200 11223', department_id: 'd1', designation_id: 'g1', manager_id: 'e6', joining_date: '2023-01-09', employment_status: 'ACTIVE', work_mode: 'WFH' },
  { id: 'e4', employee_code: 'EMP-1004', name: 'Devika Shetty', email: 'devika.shetty@roster.io', phone: '+91 98200 11224', department_id: 'd1', designation_id: 'g1', manager_id: 'e6', joining_date: '2022-11-20', employment_status: 'ACTIVE', work_mode: 'OFFICE' },
  { id: 'e5', employee_code: 'EMP-1005', name: 'Imran Qureshi', email: 'imran.qureshi@roster.io', phone: '+91 98200 11225', department_id: 'd1', designation_id: 'g2', manager_id: 'e6', joining_date: '2021-09-05', employment_status: 'ACTIVE', work_mode: 'WFH' },
  { id: 'e6', employee_code: 'EMP-1006', name: 'Vikram Joshi', email: 'vikram.joshi@roster.io', phone: '+91 98200 11226', department_id: 'd1', designation_id: 'g3', manager_id: null, joining_date: '2019-05-18', employment_status: 'ACTIVE', work_mode: 'HYBRID' },
  { id: 'e7', employee_code: 'EMP-1007', name: 'Neha Bhatt', email: 'neha.bhatt@roster.io', phone: '+91 98200 11227', department_id: 'd1', designation_id: 'g1', manager_id: 'e6', joining_date: '2023-06-12', employment_status: 'ACTIVE', work_mode: 'OFFICE' },
  { id: 'e8', employee_code: 'EMP-1008', name: 'Sameer Ali', email: 'sameer.ali@roster.io', phone: '+91 98200 11228', department_id: 'd1', designation_id: 'g1', manager_id: 'e6', joining_date: '2024-02-01', employment_status: 'INACTIVE', work_mode: 'OFFICE' },
  { id: 'e9', employee_code: 'EMP-1009', name: 'Priya Das', email: 'priya.das@roster.io', phone: '+91 98200 11229', department_id: 'd6', designation_id: 'g10', manager_id: null, joining_date: '2024-07-22', employment_status: 'ACTIVE', work_mode: 'HYBRID' },
  { id: 'e10', employee_code: 'EMP-1010', name: 'Rohan Verma', email: 'rohan.verma@roster.io', phone: '+91 98200 11230', department_id: 'd1', designation_id: 'g1', manager_id: 'e6', joining_date: '2024-08-01', employment_status: 'ACTIVE', work_mode: 'OFFICE' },
  { id: 'e11', employee_code: 'EMP-1011', name: 'Sana Iqbal', email: 'sana.iqbal@roster.io', phone: '+91 98200 11231', department_id: 'd4', designation_id: 'g9', manager_id: null, joining_date: '2024-05-15', employment_status: 'ACTIVE', work_mode: 'WFH' },
  { id: 'e12', employee_code: 'EMP-1012', name: 'Anita Rao', email: 'anita.rao@roster.io', phone: '+91 98200 11232', department_id: 'd5', designation_id: 'g6', manager_id: null, joining_date: '2022-01-10', employment_status: 'ACTIVE', work_mode: 'OFFICE' },
];

function load(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_EMPLOYEES));
      return SEED_EMPLOYEES;
    }
    return JSON.parse(raw) as Employee[];
  } catch {
    return SEED_EMPLOYEES;
  }
}

function nextEmployeeCode(existing: Employee[]): string {
  const nums = existing.map((e) => parseInt(e.employee_code.replace('EMP-', ''), 10)).filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return `EMP-${next}`;
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  }, [employees]);

  const addEmployee = useCallback((e: Omit<Employee, 'id' | 'employee_code'>) => {
    setEmployees((prev) => [
      ...prev,
      { ...e, id: crypto.randomUUID(), employee_code: nextEmployeeCode(prev) },
    ]);
  }, []);

  const updateEmployee = useCallback((id: string, patch: Partial<Omit<Employee, 'id' | 'employee_code'>>) => {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const toggleStatus = useCallback((id: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, employment_status: e.employment_status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : e,
      ),
    );
  }, []);

  return { employees, addEmployee, updateEmployee, toggleStatus };
}
