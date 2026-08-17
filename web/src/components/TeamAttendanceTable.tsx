import { hoursBetween, type AttendanceRecord } from '../data/attendance';
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
  detailView = false,
}: {
  title: string;
  employees: Employee[];
  records: AttendanceRecord[];
  leave: LeaveRequest[];
  date: string;
  detailView?: boolean;
}) {
  if (detailView) {
    const rows = employees.flatMap((emp) =>
      records
        .filter((r) => r.employee_id === emp.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => ({ employee: emp, record: r })),
    );

    return (
      <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
        <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {title}
          </h3>
          <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {rows.length} login entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--paper)' }}>
              <tr>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Employee</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Code</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Date</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Login</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Logout</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Mode</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Hours</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No login details available.
                  </td>
                </tr>
              ) : (
                rows.map(({ employee, record }) => {
                  const hours = hoursBetween(record.check_in, record.check_out);
                  return (
                    <tr key={`${employee.id}-${record.id}`} style={{ borderTop: '1px solid var(--line-soft)' }}>
                      <td className="px-4 py-3 align-top text-sm" style={{ color: 'var(--ink)' }}>{employee.name}</td>
                      <td className="px-4 py-3 align-top font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{employee.employee_code}</td>
                      <td className="px-4 py-3 align-top font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(record.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{record.check_in ?? '—'}</td>
                      <td className="px-4 py-3 align-top font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{record.check_out ?? '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <span className="font-mono px-2 py-0.5 text-[10px] uppercase" style={{ background: 'var(--accent-structure-bg)', color: 'var(--accent-structure)', borderRadius: 'var(--radius-sm)' }}>
                          {record.work_mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top font-mono text-xs" style={{ color: 'var(--ink)' }}>{hours != null ? `${hours}h` : '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <StatusTag status={record.status === 'PRESENT' ? 'present' : 'absent'} label={record.status === 'PRESENT' ? 'Present' : 'Absent'} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

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
