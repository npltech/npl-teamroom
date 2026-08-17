import { useCallback, useEffect, useState } from 'react';
import type { WorkMode } from './employees';

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

const STORAGE_KEY = 'roster.attendance';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// A short history so the page isn't empty on first load.
const SEED_ATTENDANCE: AttendanceRecord[] = [
  { id: 'a1', employee_id: 'e12', date: daysAgo(3), check_in: '09:08', check_out: '18:02', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a2', employee_id: 'e12', date: daysAgo(2), check_in: '09:14', check_out: '17:55', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a3', employee_id: 'e12', date: daysAgo(1), check_in: '09:02', check_out: '18:10', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a4', employee_id: 'e6', date: daysAgo(3), check_in: '09:30', check_out: '18:20', latitude: null, longitude: null, work_mode: 'HYBRID', status: 'PRESENT' },
  { id: 'a5', employee_id: 'e6', date: daysAgo(2), check_in: '09:25', check_out: '18:05', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a6', employee_id: 'e6', date: daysAgo(1), check_in: '09:40', check_out: '18:00', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a7', employee_id: 'e3', date: daysAgo(3), check_in: '09:12', check_out: '18:00', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a8', employee_id: 'e3', date: daysAgo(2), check_in: null, check_out: null, latitude: null, longitude: null, work_mode: 'WFH', status: 'ABSENT' },
  { id: 'a9', employee_id: 'e3', date: daysAgo(1), check_in: '09:20', check_out: '17:48', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
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

function nowHM(): string {
  return new Date().toTimeString().slice(0, 5);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Hours between two "HH:MM" timestamps, rounded to 1 decimal. Null if either is missing. */
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
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function totalHoursForMonth(records: AttendanceRecord[], employeeId: string, year: number, month: number): number {
  const monthRecords = recordsForMonth(records, employeeId, year, month);
  return Math.round(monthRecords.reduce((sum, r) => sum + (hoursBetween(r.check_in, r.check_out) ?? 0), 0) * 10) / 10;
}

/**
 * Required hours for the month: counts weekdays (Mon-Fri) at `hoursPerDay` each.
 * For the current month, only counts weekdays up to and including today —
 * you can't be "short" on hours for days that haven't happened yet.
 */
export function requiredHoursForMonth(year: number, month: number, hoursPerDay = 8): number {
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

/**
 * Centralized attendance store. Call once per page and derive filtered
 * views (mine / team / org) from the returned `records` array so every
 * view stays in sync within that page render.
 */
export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const checkIn = useCallback(
    (employeeId: string, workMode: WorkMode, coords: { latitude: number; longitude: number } | null) => {
      setRecords((prev) => {
        const existing = prev.find((r) => r.employee_id === employeeId && r.date === today());
        if (existing) return prev; // already checked in today
        const rec: AttendanceRecord = {
          id: crypto.randomUUID(),
          employee_id: employeeId,
          date: today(),
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
    setRecords((prev) =>
      prev.map((r) => (r.employee_id === employeeId && r.date === today() ? { ...r, check_out: nowHM() } : r)),
    );
  }, []);

  return { records, checkIn, checkOut, today: today() };
}
