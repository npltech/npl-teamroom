import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { hoursBetween, useAttendance } from '../data/attendance';
import { useCurrentEmployee } from '../data/currentUser';
import { useEmployees, type WorkMode } from '../data/employees';
import { useLeaveRequests } from '../data/leave';
import { StatusTag } from '../components/Ledger';
import { TeamAttendanceTable } from '../components/TeamAttendanceTable';
import { MonthlyTimesheet } from '../components/MonthlyTimesheet';
import type { Role } from '../data/roles';

type Ctx = { role: Role };

const WORK_MODES: WorkMode[] = ['OFFICE', 'WFH', 'HYBRID'];

type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'done'; coords: { latitude: number; longitude: number } | null };

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export default function AttendancePage() {
  const { role } = useOutletContext<Ctx>();
  const employee = useCurrentEmployee(role);
  const { employees } = useEmployees();
  const { records, checkIn, checkOut, today } = useAttendance();
  const { requests: leaveRequests } = useLeaveRequests();

  const [workMode, setWorkMode] = useState<WorkMode>(employee?.work_mode ?? 'OFFICE');
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });

  const mine = useMemo(
    () =>
      employee
        ? records.filter((r) => r.employee_id === employee.id).sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [records, employee],
  );
  const todayRecord = mine.find((r) => r.date === today) ?? null;

  // Who this role is allowed to see, beyond themselves.
  const canViewOrg = role === 'HR' || role === 'SUPER_ADMIN';
  const canViewTeam = role === 'MANAGER';
  const visibleTeam = canViewOrg
    ? employees
    : canViewTeam && employee
      ? employees.filter((e) => e.manager_id === employee.id)
      : [];

  function handleCheckIn() {
    if (!employee) return;
    if (!('geolocation' in navigator)) {
      checkIn(employee.id, workMode, null);
      return;
    }
    setLocation({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation({ status: 'done', coords });
        checkIn(employee.id, workMode, coords);
      },
      () => {
        setLocation({ status: 'done', coords: null });
        checkIn(employee.id, workMode, null);
      },
      { timeout: 8000 },
    );
  }

  const todayHours = todayRecord ? hoursBetween(todayRecord.check_in, todayRecord.check_out) : null;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--status-present)' }}>
        Attendance
      </p>
      <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        {employee ? employee.name : 'Organization attendance'}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {employee ? `${employee.employee_code} · ` : ''}
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}
      </p>

      {/* Self check-in — only for roles tied to an employee record */}
      {employee && (
        <div
          className="mt-6 border p-6"
          style={{ background: 'var(--ink)', borderColor: 'var(--ink)', borderRadius: 'var(--radius-md)' }}
        >
          {!todayRecord ? (
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-on-ink-muted)' }}>
                  Status
                </p>
                <p className="font-display mt-1 text-xl font-medium" style={{ color: 'var(--text-on-ink)' }}>
                  Not checked in yet
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                  className="border bg-transparent px-3 py-2 font-mono text-xs"
                  style={{ borderColor: 'rgba(241,242,237,0.25)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  {WORK_MODES.map((m) => (
                    <option key={m} value={m} style={{ color: '#1B2430' }}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCheckIn}
                  disabled={location.status === 'locating'}
                  className="px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--status-present)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                >
                  {location.status === 'locating' ? 'Locating…' : 'Check in'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="flex flex-wrap gap-10">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-on-ink-muted)' }}>
                    Checked in
                  </p>
                  <p className="font-mono mt-1 text-xl" style={{ color: 'var(--text-on-ink)' }}>
                    {todayRecord.check_in}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-on-ink-muted)' }}>
                    Work mode
                  </p>
                  <p className="font-mono mt-1 text-xl" style={{ color: 'var(--text-on-ink)' }}>
                    {todayRecord.work_mode}
                  </p>
                </div>
                {todayRecord.check_out && (
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-on-ink-muted)' }}>
                      Checked out
                    </p>
                    <p className="font-mono mt-1 text-xl" style={{ color: 'var(--text-on-ink)' }}>
                      {todayRecord.check_out}
                    </p>
                  </div>
                )}
                {todayHours != null && (
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-on-ink-muted)' }}>
                      Hours today
                    </p>
                    <p className="font-mono mt-1 text-xl" style={{ color: 'var(--status-present)' }}>
                      {todayHours} hrs
                    </p>
                  </div>
                )}
              </div>
              {!todayRecord.check_out ? (
                <button
                  onClick={() => checkOut(employee.id)}
                  className="px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ background: 'var(--status-absent)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                >
                  Check out
                </button>
              ) : (
                <span
                  className="font-mono px-3 py-1.5 text-xs uppercase tracking-wide"
                  style={{ background: 'var(--status-present-bg)', color: 'var(--status-present)', borderRadius: 'var(--radius-sm)' }}
                >
                  Day complete
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {employee && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Recent history */}
          <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
            <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                Recent history
              </h3>
            </div>
            {mine.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No attendance recorded yet.
              </p>
            ) : (
              mine.map((r) => {
                const hrs = hoursBetween(r.check_in, r.check_out);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 border-b px-5 py-3 last:border-b-0"
                    style={{ borderColor: 'var(--line-soft)' }}
                  >
                    <span
                      className="h-8 w-[3px] shrink-0"
                      style={{ background: r.status === 'PRESENT' ? 'var(--status-present)' : 'var(--status-absent)' }}
                    />
                    <span className="w-24 shrink-0 text-sm" style={{ color: 'var(--ink)' }}>
                      {formatDate(r.date)}
                    </span>
                    <span className="font-mono w-28 shrink-0 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {r.check_in ?? '—'}→{r.check_out ?? '—'}
                    </span>
                    <span className="font-mono ml-auto text-xs" style={{ color: hrs ? 'var(--ink)' : 'var(--text-muted)' }}>
                      {hrs != null ? `${hrs}h` : ''}
                    </span>
                    <StatusTag
                      status={r.status === 'PRESENT' ? 'present' : 'absent'}
                      label={r.status === 'PRESENT' ? 'Present' : 'Absent'}
                    />
                  </div>
                );
              })
            )}
          </div>

          <MonthlyTimesheet employeeId={employee.id} records={records} />
        </div>
      )}

      {/* Team / org view */}
      {(canViewOrg || canViewTeam) && (
        <div className="mt-6">
          <TeamAttendanceTable
            title={canViewOrg ? 'Organization attendance — today' : 'My team — today'}
            employees={visibleTeam}
            records={records}
            leave={leaveRequests}
            date={today}
          />
        </div>
      )}

      {!employee && !canViewOrg && !canViewTeam && (
        <div
          className="mt-6 flex min-h-[30vh] flex-col items-center justify-center border border-dashed text-center"
          style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-md)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Nothing to show for this role yet.
          </p>
        </div>
      )}
    </div>
  );
}
