import type { AttendanceRecord } from '../data/attendance';
import type { Employee } from '../data/employees';
import type { LeaveRequest } from '../data/leave';
import { StatusTag } from './Ledger';

type RowStatus = 'present' | 'pending' | 'neutral';

function statusFor(
  employeeId: string,
  date: string,
  records: AttendanceRecord[],
  leave: LeaveRequest[],
): { status: RowStatus; label: string; time: string | null } {
  const rec = records.find((r) => r.employee_id === employeeId && r.date === date);
  if (rec) return { status: 'present', label: rec.check_out ? 'Present' : 'Checked in', time: rec.check_in };

  const onLeave = leave.some(
    (l) => l.employee_id === employeeId && l.status === 'APPROVED' && date >= l.start_date && date <= l.end_date,
  );
  if (onLeave) return { status: 'pending', label: 'On leave', time: null };

  return { status: 'neutral', label: 'Not marked', time: null };
}

export function TeamAttendanceTable({
  title,
  employees,
  records,
  leave,
  date,
}: {
  title: string;
  employees: Employee[];
  records: AttendanceRecord[];
  leave: LeaveRequest[];
  date: string;
}) {
  return (
    <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
      <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          {employees.length} people
        </span>
      </div>
      {employees.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No one to show here.
        </p>
      ) : (
        employees.map((emp) => {
          const s = statusFor(emp.id, date, records, leave);
          return (
            <div
              key={emp.id}
              className="flex items-center gap-4 border-b px-5 py-3 last:border-b-0"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <span
                className="h-8 w-[3px] shrink-0"
                style={{
                  background:
                    s.status === 'present'
                      ? 'var(--status-present)'
                      : s.status === 'pending'
                        ? 'var(--status-pending)'
                        : 'var(--status-neutral)',
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {emp.name}
                </p>
                <p className="font-mono truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                  {emp.employee_code}
                </p>
              </div>
              {s.time && (
                <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {s.time}
                </span>
              )}
              <StatusTag status={s.status} label={s.label} />
            </div>
          );
        })
      )}
    </div>
  );
}
