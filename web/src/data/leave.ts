import { useCallback, useEffect, useState } from 'react';

export type LeaveType = 'Casual' | 'Sick' | 'Annual' | 'Other';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  employee_id: string;
  type: LeaveType;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  requested_at: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'roster.leave';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Mirrors the names already used in the dashboard "Leave requests" / "Leave
// approvals" ledger widgets, so the numbers agree across the app.
const SEED_LEAVE: LeaveRequest[] = [
  { id: 'l1', employee_id: 'e12', type: 'Sick', start_date: daysAgo(-2), end_date: daysAgo(-1), reason: 'Fever, resting at home', status: 'PENDING', requested_at: daysAgo(1) },
  { id: 'l2', employee_id: 'e6', type: 'Annual', start_date: daysAgo(-10), end_date: daysAgo(-6), reason: 'Family trip', status: 'APPROVED', requested_at: daysAgo(6) },
  { id: 'l3', employee_id: 'e9', type: 'Casual', start_date: daysAgo(-4), end_date: daysAgo(-4), reason: 'Personal errand', status: 'REJECTED', requested_at: daysAgo(5) },
  { id: 'l4', employee_id: 'e7', type: 'Annual', start_date: daysAgo(-14), end_date: daysAgo(-12), reason: 'Sister\u2019s wedding', status: 'PENDING', requested_at: daysAgo(2) },
  { id: 'l5', employee_id: 'e4', type: 'Sick', start_date: daysAgo(-1), end_date: daysAgo(-1), reason: 'Doctor\u2019s appointment', status: 'PENDING', requested_at: daysAgo(0) },
];

function load(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_LEAVE));
      return SEED_LEAVE;
    }
    return JSON.parse(raw) as LeaveRequest[];
  } catch {
    return SEED_LEAVE;
  }
}

/** Inclusive day count between start and end. */
export function leaveDayCount(r: Pick<LeaveRequest, 'start_date' | 'end_date'>): number {
  const start = new Date(r.start_date + 'T00:00:00');
  const end = new Date(r.end_date + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function useLeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  const requestLeave = useCallback(
    (employeeId: string, payload: { type: LeaveType; start_date: string; end_date: string; reason: string }) => {
      setRequests((prev) => [
        {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          status: 'PENDING',
          requested_at: new Date().toISOString().slice(0, 10),
          ...payload,
        },
        ...prev,
      ]);
    },
    [],
  );

  const decide = useCallback((id: string, status: 'APPROVED' | 'REJECTED') => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  const approve = useCallback((id: string) => decide(id, 'APPROVED'), [decide]);
  const reject = useCallback((id: string) => decide(id, 'REJECTED'), [decide]);

  return { requests, requestLeave, approve, reject };
}
