import { useCallback, useEffect, useState } from 'react';
import type { WorkMode } from './employees';

export const STANDARD_HOURS_PER_DAY = 9;
export const STANDARD_SHIFT_END = '18:00';

export type OvertimeApprovalStatus = 'approved' | 'pending' | 'rejected';

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
  is_manual_entry: boolean;
  manual_entry_reason: string | null;
  is_early_checkout: boolean;
  early_checkout_reason: string | null;
  overtime_minutes: number;
  overtime_reason: string | null;
  overtime_approval_status: OvertimeApprovalStatus | null;
  overtime_approved_by: string | null;
  mats: string | null;
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

const SEED_ATTENDANCE: Partial<AttendanceRecord>[] = [
  { id: 'a1', employee_id: 'e12', date: daysAgo(3), check_in: '09:08', check_out: '18:02', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a2', employee_id: 'e12', date: daysAgo(2), check_in: '09:14', check_out: '17:55', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a3', employee_id: 'e12', date: daysAgo(1), check_in: '09:02', check_out: '18:10', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a4', employee_id: 'e6', date: daysAgo(3), check_in: '09:30', check_out: '18:20', latitude: null, longitude: null, work_mode: 'HYBRID', status: 'PRESENT' },
  { id: 'a5', employee_id: 'e6', date: daysAgo(2), check_in: '09:25', check_out: '18:05', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a6', employee_id: 'e6', date: daysAgo(1), check_in: '09:40', check_out: '18:00', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a7', employee_id: 'e3', date: daysAgo(3), check_in: '09:12', check_out: '18:00', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a8', employee_id: 'e3', date: daysAgo(2), check_in: '09:00', check_out: '17:30', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a9', employee_id: 'e3', date: daysAgo(1), check_in: '09:20', check_out: '17:48', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'a10', employee_id: 'e3', date: daysAgo(6), check_in: '09:05', check_out: '11:25', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a11', employee_id: 'e3', date: daysAgo(6), check_in: '12:30', check_out: '18:15', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'a12', employee_id: 'e2', date: daysAgo(2), check_in: '09:10', check_out: '17:50', latitude: null, longitude: null, work_mode: 'HYBRID', status: 'PRESENT' },
  { id: 'a13', employee_id: 'e7', date: daysAgo(1), check_in: '09:15', check_out: '18:05', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT' },
];

const TODAY_SAMPLE_ATTENDANCE: Partial<AttendanceRecord>[] = [
  { id: 'today-e1', employee_id: 'e1', date: daysAgo(0), check_in: '09:02', check_out: '18:04', latitude: 30.901, longitude: 75.857, work_mode: 'OFFICE', status: 'PRESENT' },
  { id: 'today-e2', employee_id: 'e2', date: daysAgo(0), check_in: '09:25', check_out: '17:40', latitude: null, longitude: null, work_mode: 'HYBRID', status: 'PRESENT' },
  { id: 'today-e3', employee_id: 'e3', date: daysAgo(0), check_in: '09:12', check_out: '17:48', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'today-e5', employee_id: 'e5', date: daysAgo(0), check_in: null, check_out: null, latitude: null, longitude: null, work_mode: 'WFH', status: 'ABSENT' },
  { id: 'today-e7', employee_id: 'e7', date: daysAgo(0), check_in: '08:58', check_out: '17:32', latitude: null, longitude: null, work_mode: 'OFFICE', status: 'PRESENT', is_manual_entry: true, manual_entry_reason: 'Biometric scanner was unavailable at the entrance' },
  { id: 'today-e9', employee_id: 'e9', date: daysAgo(0), check_in: '09:06', check_out: '18:01', latitude: null, longitude: null, work_mode: 'HYBRID', status: 'PRESENT' },
];

const EMPLOYEE_MONTH_SAMPLE_ATTENDANCE: Partial<AttendanceRecord>[] = [
  { id: 'aug-e3-01', employee_id: 'e3', date: '2026-08-03', check_in: '09:06', check_out: '18:02', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-02', employee_id: 'e3', date: '2026-08-04', check_in: '09:18', check_out: '17:55', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-03', employee_id: 'e3', date: '2026-08-05', check_in: '08:58', check_out: '18:10', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-04', employee_id: 'e3', date: '2026-08-06', check_in: '09:11', check_out: '18:00', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-05', employee_id: 'e3', date: '2026-08-07', check_in: '09:03', check_out: '17:48', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-06', employee_id: 'e3', date: '2026-08-10', check_in: '09:14', check_out: '18:06', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-07', employee_id: 'e3', date: '2026-08-11', check_in: '09:00', check_out: '17:40', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-08', employee_id: 'e3', date: '2026-08-12', check_in: '09:09', check_out: '18:12', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-09', employee_id: 'e3', date: '2026-08-13', check_in: '09:21', check_out: '17:52', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-10', employee_id: 'e3', date: '2026-08-14', check_in: '09:05', check_out: '18:04', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-11', employee_id: 'e3', date: '2026-08-17', check_in: '09:08', check_out: '17:58', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-12', employee_id: 'e3', date: '2026-08-18', check_in: '09:16', check_out: '18:01', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-13', employee_id: 'e3', date: '2026-08-19', check_in: '09:02', check_out: '17:46', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-14', employee_id: 'e3', date: '2026-08-20', check_in: '09:12', check_out: '18:08', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
  { id: 'aug-e3-15', employee_id: 'e3', date: '2026-08-21', check_in: '09:07', check_out: '17:54', latitude: null, longitude: null, work_mode: 'WFH', status: 'PRESENT' },
];

function load(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = [...SEED_ATTENDANCE, ...TODAY_SAMPLE_ATTENDANCE, ...EMPLOYEE_MONTH_SAMPLE_ATTENDANCE].map(normalizeRecord);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const stored = JSON.parse(raw) as Partial<AttendanceRecord>[];
    const today = daysAgo(0);
    const todayRecords = stored.filter((record) => record.date === today);
    const missingSamples = TODAY_SAMPLE_ATTENDANCE.filter((sample) => {
      const employeeRecords = todayRecords.filter((record) => record.employee_id === sample.employee_id);
      return sample.check_in ? !employeeRecords.some((record) => record.check_in) : employeeRecords.length === 0;
    });
    const missingEmployeeMonthSamples = EMPLOYEE_MONTH_SAMPLE_ATTENDANCE.filter((sample) => !stored.some((record) => record.id === sample.id));
    return [...stored, ...missingSamples, ...missingEmployeeMonthSamples].map(normalizeRecord);
  } catch {
    return [...SEED_ATTENDANCE, ...TODAY_SAMPLE_ATTENDANCE, ...EMPLOYEE_MONTH_SAMPLE_ATTENDANCE].map(normalizeRecord);
  }
}

function minutesFromTime(time: string | null): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function normalizeRecord(record: Partial<AttendanceRecord>): AttendanceRecord {
  const checkOutMinutes = minutesFromTime(record.check_out ?? null);
  const workedMinutes = record.check_in && record.check_out
    ? Math.max(0, (minutesFromTime(record.check_out) ?? 0) - (minutesFromTime(record.check_in) ?? 0))
    : 0;
  const early = checkOutMinutes !== null && checkOutMinutes < minutesFromTime(STANDARD_SHIFT_END)!;
  const overtime = record.overtime_minutes ?? Math.max(0, workedMinutes - STANDARD_HOURS_PER_DAY * 60);
  return {
    id: record.id ?? crypto.randomUUID(),
    employee_id: record.employee_id ?? '',
    date: record.date ?? today(),
    check_in: record.check_in ?? null,
    check_out: record.check_out ?? null,
    latitude: record.latitude ?? null,
    longitude: record.longitude ?? null,
    work_mode: record.work_mode ?? 'OFFICE',
    status: record.status ?? 'PRESENT',
    is_manual_entry: record.is_manual_entry ?? false,
    manual_entry_reason: record.manual_entry_reason ?? null,
    is_early_checkout: record.is_early_checkout ?? early,
    early_checkout_reason: record.early_checkout_reason ?? null,
    overtime_minutes: overtime,
    overtime_reason: record.overtime_reason ?? null,
    overtime_approval_status: record.overtime_approval_status ?? (overtime > 0 ? 'pending' : null),
    overtime_approved_by: record.overtime_approved_by ?? null,
    mats: record.mats ?? null,
  };
}

function validateRecord(record: Pick<AttendanceRecord, 'is_manual_entry' | 'manual_entry_reason' | 'is_early_checkout' | 'early_checkout_reason' | 'overtime_minutes' | 'overtime_reason'>): boolean {
  return (!record.is_manual_entry || Boolean(record.manual_entry_reason?.trim()))
    && (!record.is_early_checkout || Boolean(record.early_checkout_reason?.trim()))
    && (record.overtime_minutes <= 0 || Boolean(record.overtime_reason?.trim()));
}

function deriveMetadata(checkIn: string | null, checkOut: string | null, overrides: Partial<AttendanceRecord> = {}): Pick<AttendanceRecord, 'is_early_checkout' | 'overtime_minutes' | 'overtime_approval_status'> {
  const inMinutes = minutesFromTime(checkIn);
  const outMinutes = minutesFromTime(checkOut);
  const workedMinutes = inMinutes !== null && outMinutes !== null ? Math.max(0, outMinutes - inMinutes) : 0;
  const overtimeMinutes = Math.max(0, workedMinutes - STANDARD_HOURS_PER_DAY * 60);
  return {
    is_early_checkout: outMinutes !== null && outMinutes < minutesFromTime(STANDARD_SHIFT_END)!,
    overtime_minutes: overrides.overtime_minutes ?? overtimeMinutes,
    overtime_approval_status: (overrides.overtime_minutes ?? overtimeMinutes) > 0 ? (overrides.overtime_approval_status ?? 'pending') : null,
  };
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
          is_manual_entry: false,
          manual_entry_reason: null,
          is_early_checkout: false,
          early_checkout_reason: null,
          overtime_minutes: 0,
          overtime_reason: null,
          overtime_approval_status: null,
          overtime_approved_by: null,
          mats: null,
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
    (employeeId: string, draft: { date: string; check_in: string; check_out: string; work_mode: WorkMode; manual_entry_reason: string; early_checkout_reason?: string; overtime_reason?: string }) => {
      const metadata = deriveMetadata(draft.check_in, draft.check_out);
      const record = normalizeRecord({
        id: crypto.randomUUID(), employee_id: employeeId, date: draft.date, check_in: draft.check_in, check_out: draft.check_out,
        latitude: null, longitude: null, work_mode: draft.work_mode, status: 'PRESENT', is_manual_entry: true,
        manual_entry_reason: draft.manual_entry_reason, early_checkout_reason: draft.early_checkout_reason ?? null,
        overtime_reason: draft.overtime_reason ?? null, ...metadata,
      });
      if (!validateRecord(record)) return false;
      setRecords((prev) => [
        record,
        ...prev,
      ]);
      return true;
    },
    [],
  );

  const updateAttendanceRecord = useCallback(
    (recordId: string, changes: Pick<AttendanceRecord, 'check_in' | 'check_out' | 'work_mode'> & Partial<Pick<AttendanceRecord, 'early_checkout_reason' | 'overtime_reason' | 'overtime_approval_status'>>, reason: string) => {
      if (!reason.trim()) return false;
      let previous: AttendanceRecord | null = null;
      setRecords((prev) => {
        previous = prev.find((record) => record.id === recordId) ?? null;
        if (!previous) return prev;
        return prev.map((record) => {
          if (record.id !== recordId) return record;
          const next = normalizeRecord({ ...record, ...changes, ...deriveMetadata(changes.check_in, changes.check_out, changes), is_manual_entry: true, manual_entry_reason: reason.trim() });
          return validateRecord(next) ? next : record;
        });
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
