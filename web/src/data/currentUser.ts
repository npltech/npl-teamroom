import { useEmployees, type Employee } from './employees';
import type { Role } from './roles';

// Demo-only: in the real app this comes from the authenticated Supabase user's
// profile row (profiles.employee_id), not a role->id lookup table.
const CURRENT_EMPLOYEE_BY_ROLE: Partial<Record<Role, string>> = {
  HR: 'e12', // Anita Rao — HR Executive
  MANAGER: 'e6', // Vikram Joshi — Engineering Manager
  EMPLOYEE: 'e3', // Arjun Sinha
};

export function useCurrentEmployee(role: Role): Employee | null {
  const { employees } = useEmployees();
  const id = CURRENT_EMPLOYEE_BY_ROLE[role];
  if (!id) return null;
  return employees.find((e) => e.id === id) ?? null;
}
