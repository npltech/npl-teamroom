import { useCallback, useEffect, useState } from 'react';
import type { WorkMode } from './employees';

export const STANDARD_HOURS_PER_DAY = 9;

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  check_in: string | null; // HH:MM
  check_out: string | null; // HH:MM
  latitude: number | null;
  longitude: number | null;
  work_mode: WorkMode;
  status: 'PRESENT' | 'ABSENT';
}

export interface AttendanceAuditEntry {
  id: string;
  record_id: string;
  changed_by: string;
  changed_on: string;
  previous_check_in: string | null;
  previous_check_out: string | null;
  updated_check_in: string | null;
  updated_check_out: string | null;
  reason: string;
}

const STORAGE_KEY = 'roster.attendance';
const AUDIT_STORAGE_KEY = 'roster.attendance.audit';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const SEED_ATTENDANCE: AttendanceRecord[] = [
  { id: 'a1',  employee_id: 'e12', date: daysAgo(3), check_in: '09:08', check_out: '18:02', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a2',  employee_id: 'e12', date: daysAgo(2), check_in: '09:14', check_out: '17:55', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a3',  employee_id: 'e12', date: daysAgo(1), check_in: '09:02', check_out: '18:10', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a4',  employee_id: 'e6', date: daysAgo(3), check_in: '09:30', check_out: '18:20', latitude: null, longitude: null, work_mode: 'HYBRID', status: 'PRESENT' },
  { id: 'a5',  employee_id: 'e6', date: daysAgo(2), check_in: '09:25', check_out: '18:05', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a6',  employee_id: 'e6', date: daysAgo(1), check_in: '09:40', check_out: '18:00', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a7',  employee_id: 'e3', date: daysAgo(3), check_in: '09:12', check_out: '18:00', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a8',  employee_id: 'e3', date: daysAgo(2), check_in: '09:00', check_out: '17:30', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a9',  employee_id: 'e3', date: daysAgo(1), check_in: '09:20', check_out: '17:48', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a10', employee_id: 'e3', date: daysAgo(6), check_in: '09:05', check_out: '11:25', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a11', employee_id: 'e3', date: daysAgo(6), check_in: '12:30', check_out: '18:15', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a12', employee_id: 'e2', date: daysAgo(2), check_in: '09:10', check_out: '17:50', latitude: null, longitude: null, work_mode: 'HYBRID', status: 'PRESENT' },
  { id: 'a13', employee_id: 'e7', date: daysAgo(1), check_in: '09:15', check_out: '18:05', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
];

function load(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ATTENDANCE));
      return SEED_ATTENDANCE;
    }
    return JSON.parse(raw) as AttendanceRecord[];
  } catch {
    return SEED_ATTENDANCE;
  }
}

function loadAudit(): AttendanceAuditEntry[] {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) ?? '[]') as AttendanceAuditEntry[];
  } catch {
    return [];
  }
}

function nowHM(): string {
  return new Date().toTimeString().slice(0, 5);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function hoursBetween(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const minutes = outH * 60 + outM - (inH * 60 + inM);
  if (minutes <= 0) return null;
  return Math.round((minutes / 60) * 10) / 10;
}

export function recordsForMonth(records: AttendanceRecord[], employeeId: string, year: number, month: number): AttendanceRecord[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return records
    .filter((r) => r.employee_id === employeeId && r.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.check_in ?? '').localeCompare(b.check_in ?? ''));
}

export function totalHoursForMonth(records: AttendanceRecord[], employeeId: string, year: number, month: number): number {
  return Math.round(
    recordsForMonth(records, employeeId, year, month).reduce((sum, r) => sum + (hoursBetween(r.check_in, r.check_out) ?? 0), 0) * 10,
  ) / 10;
}

export function daySessionsForMonth(
  records: AttendanceRecord[],
  employeeId: string,
  year: number,
  month: number,
): Array<{ date: string; sessions: AttendanceRecord[]; total: number }> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const result: Array<{ date: string; sessions: AttendanceRecord[]; total: number }> = [];

  for (let day = 1; day <= end.getDate(); day++) {
    const date = new Date(year, month - 1, day).toISOString().slice(0, 10);
    const sessions = records
      .filter((r) => r.employee_id === employeeId && r.date === date)
      .sort((a, b) => (a.check_in ?? '').localeCompare(b.check_in ?? ''));

    const total = sessions.reduce((sum, r) => sum + (hoursBetween(r.check_in, r.check_out) ?? 0), 0);
    result.push({ date, sessions, total: Math.round(total * 10) / 10 });
  }

  return result.filter((entry) => entry.date >= start.toISOString().slice(0, 10) && entry.date <= end.toISOString().slice(0, 10));
}

export function requiredHoursForMonth(year: number, month: number, hoursPerDay = STANDARD_HOURS_PER_DAY): number {
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const lastDay = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();

  let weekdays = 0;
  for (let day = 1; day <= lastDay; day++) {
    const dow = new Date(year, month - 1, day).getDay();
    if (dow !== 0 && dow !== 6) weekdays++;
  }
  return weekdays * hoursPerDay;
}

export function hasOpenSession(records: AttendanceRecord[], employeeId: string, date = today()): AttendanceRecord | null {
  return (
    records.find(
      (r) => r.employee_id === employeeId && r.date === date && r.check_in && !r.check_out,
    ) ?? null
  );
}

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => load());
  const [audit, setAudit] = useState<AttendanceAuditEntry[]>(() => loadAudit());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(audit));
  }, [audit]);

  const checkIn = useCallback(
    (employeeId: string, workMode: WorkMode, coords: { latitude: number; longitude: number } | null) => {
      setRecords((prev) => {
        const date = today();
        const active = prev.find(
          (r) => r.employee_id === employeeId && r.date === date && r.check_in && !r.check_out,
        );
        if (active) return prev;

        const rec: AttendanceRecord = {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          date,
          check_in: nowHM(),
          check_out: null,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          work_mode: workMode,
          status: 'PRESENT',
        };
        return [rec, ...prev];
      });
    },
    [],
  );

  const checkOut = useCallback((employeeId: string) => {
    setRecords((prev) => {
      const todayDate = today();
      const open = [...prev]
        .filter((r) => r.employee_id === employeeId && r.date === todayDate && r.check_in && !r.check_out)
        .sort((a, b) => (a.check_in ?? '').localeCompare(b.check_in ?? ''))
        .at(-1);

      if (!open) return prev;
      return prev.map((r) => (r.id === open.id ? { ...r, check_out: nowHM(), status: 'PRESENT' } : r));
    });
  }, []);

  const addManualEntry = useCallback(
    (employeeId: string, draft: { date: string; check_in: string; check_out: string; work_mode: WorkMode }) => {
      setRecords((prev) => [
        {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          date: draft.date,
          check_in: draft.check_in,
          check_out: draft.check_out,
          latitude: null,
          longitude: null,
          work_mode: draft.work_mode,
          status: 'PRESENT',
        },
        ...prev,
      ]);
    },
    [],
  );

  const updateAttendanceRecord = useCallback(
    (recordId: string, changes: Pick<AttendanceRecord, 'check_in' | 'check_out' | 'work_mode'>, reason: string) => {
      if (!reason.trim()) return false;
      let previous: AttendanceRecord | null = null;
      setRecords((prev) => {
        previous = prev.find((record) => record.id === recordId) ?? null;
        if (!previous) return prev;
        return prev.map((record) => (record.id === recordId ? { ...record, ...changes, status: 'PRESENT' } : record));
      });
      if (!previous) return false;
      setAudit((prev) => [
        {
          id: crypto.randomUUID(),
          record_id: recordId,
          changed_by: 'Super Admin',
          changed_on: new Date().toISOString().slice(0, 10),
          previous_check_in: previous!.check_in,
          previous_check_out: previous!.check_out,
          updated_check_in: changes.check_in,
          updated_check_out: changes.check_out,
          reason: reason.trim(),
        },
        ...prev,
      ]);
      return true;
    },
    [],
  );

  return { records, checkIn, checkOut, addManualEntry, updateAttendanceRecord, audit, today: today() };
}
