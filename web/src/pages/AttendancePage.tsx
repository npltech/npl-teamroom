import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  hasOpenSession,
  hoursBetween,
  useAttendance,
  type AttendanceRecord,
} from '../data/attendance';
import { useCurrentEmployee } from '../data/currentUser';
import { useDepartments } from '../data/departments';
import { useEmployees, type WorkMode } from '../data/employees';
import { useHolidays } from '../data/holidays';
import type { Role } from '../data/roles';

type Ctx = { role: Role };

type LocationState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'done'; coords: { latitude: number; longitude: number } | null };

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WORK_MODES: WorkMode[] = ['OFFICE', 'WFH', 'HYBRID'];


export default function AttendancePage() {
  const { role } = useOutletContext<Ctx>();
  const employee = useCurrentEmployee(role);
  const { employees } = useEmployees();
  const { departments } = useDepartments();
  const { holidays } = useHolidays();
  const { records, checkIn, checkOut, addManualEntry, today } = useAttendance();

  const isHRAdmin = role === 'HR' || role === 'SUPER_ADMIN';
  const [viewMode, setViewMode] = useState<'my' | 'employee'>('my');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [workMode, setWorkMode] = useState<WorkMode>(employee?.work_mode ?? 'OFFICE');
  const [location, setLocation] = useState<LocationState>({ status: 'idle' });
  const [manualMode, setManualMode] = useState(false);
  const [manualForm, setManualForm] = useState({
    date: today,
    check_in: '09:00',
    check_out: '18:00',
    work_mode: 'OFFICE' as WorkMode,
  });
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const currentEmployee = employee ?? employees[0] ?? null;
  const visibleEmployee = selectedEmployeeId
    ? employees.find((item) => item.id === selectedEmployeeId) ?? currentEmployee
    : currentEmployee;
  const showEmployeeList = isHRAdmin && viewMode === 'employee' && !selectedEmployeeId;
  const targetEmployee = visibleEmployee ?? currentEmployee;

  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

  const targetSessions = useMemo(() => {
    if (!targetEmployee) return [] as AttendanceRecord[];
    return records.filter((record) => record.employee_id === targetEmployee.id).sort((a, b) => a.date.localeCompare(b.date));
  }, [records, targetEmployee]);

  const todaySessions = useMemo(() => {
    if (!targetEmployee) return [] as AttendanceRecord[];
    return records.filter((record) => record.employee_id === targetEmployee.id && record.date === today);
  }, [records, targetEmployee, today]);

  const currentDayOpen = targetEmployee ? hasOpenSession(records, targetEmployee.id, today) : null;

  const monthDays = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const leading = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((leading + last.getDate()) / 7) * 7;
    const days: Array<{ iso: string; inMonth: boolean; day: number }> = [];

    for (let index = 0; index < totalCells; index += 1) {
      const date = new Date(year, month - 1, index - leading + 1);
      const iso = date.toISOString().slice(0, 10);
      days.push({ iso, inMonth: date.getMonth() === month - 1, day: date.getDate() });
    }

    return days;
  }, [year, month]);

  const monthlyStatus = useMemo(() => {
    const map = new Map<string, 'present' | 'holiday' | 'muted'>();

    for (const entry of monthDays) {
      const sessions = targetSessions.filter((record) => record.date === entry.iso);
      const isWeekend = [0, 6].includes(new Date(`${entry.iso}T00:00:00`).getDay());
      const isHoliday = holidaySet.has(entry.iso);
      const status = isHoliday ? 'holiday' : isWeekend ? 'muted' : sessions.length > 0 ? 'present' : 'muted';
      map.set(entry.iso, status);
    }
    return map;
  }, [monthDays, targetSessions, holidaySet]);

  const selectedDaySessions = useMemo(() => {
    if (!targetEmployee) return [] as AttendanceRecord[];
    return records
      .filter((record) => record.employee_id === targetEmployee.id && record.date === selectedDate)
      .sort((a, b) => (a.check_in ?? '').localeCompare(b.check_in ?? ''));
  }, [records, targetEmployee, selectedDate]);

  const selectedDayTotal = useMemo(
    () => selectedDaySessions.reduce((sum, session) => sum + (hoursBetween(session.check_in, session.check_out) ?? 0), 0),
    [selectedDaySessions],
  );

  const runningHoursToday = useMemo(() => {
    if (!targetEmployee) return 0;
    return todaySessions.reduce((sum, session) => {
      const endTime = session.check_out ?? new Date().toTimeString().slice(0, 5);
      return sum + (hoursBetween(session.check_in, endTime) ?? 0);
    }, 0);
  }, [targetEmployee, todaySessions]);

  const lastCheckout = useMemo(() => {
    const sessions = [...todaySessions].filter((session) => session.check_out).sort((a, b) => (a.check_out ?? '').localeCompare(b.check_out ?? ''));
    return sessions.length > 0 ? sessions[sessions.length - 1].check_out : '—';
  }, [todaySessions]);

  const filteredEmployees = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return employees.filter((emp) => {
      const deptOk = departmentFilter === 'ALL' || emp.department_id === departmentFilter;
      const employeeOk = employeeFilter === 'ALL' || emp.id === employeeFilter;
      const searchOk = !search || emp.name.toLowerCase().includes(search);
      return deptOk && employeeOk && searchOk;
    });
  }, [employees, departmentFilter, employeeFilter, searchTerm]);

  const adminRows = useMemo(
    () =>
      filteredEmployees.map((emp) => {
        const logged = records.filter((r) => r.employee_id === emp.id && r.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)).reduce((sum, r) => sum + (hoursBetween(r.check_in, r.check_out) ?? 0), 0);
        const required = new Date(year, month, 0).getDate();
        const workingDays = Array.from({ length: required }, (_, index) => new Date(year, month - 1, index + 1)).filter((date) => date.getDay() !== 0 && date.getDay() !== 6).length;
        const requiredHours = workingDays * 9;
        const variance = Number((logged - requiredHours).toFixed(1));
        const hasToday = records.some((r) => r.employee_id === emp.id && r.date === today);
        return { employee: emp, logged: Number(logged.toFixed(1)), required: requiredHours, variance, hasToday };
      }),
    [filteredEmployees, records, year, month, today],
  );

  function handleCheckIn() {
    if (!targetEmployee) return;
    if (!('geolocation' in navigator)) {
      checkIn(targetEmployee.id, workMode, null);
      return;
    }

    setLocation({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setLocation({ status: 'done', coords });
        checkIn(targetEmployee.id, workMode, coords);
      },
      () => {
        setLocation({ status: 'done', coords: null });
        checkIn(targetEmployee.id, workMode, null);
      },
      { timeout: 8000 },
    );
  }

  function handleManualSave(event: React.FormEvent) {
    event.preventDefault();
    if (!targetEmployee) return;
    if (!manualForm.date || !manualForm.check_in || !manualForm.check_out) return;
    addManualEntry(targetEmployee.id, {
      date: manualForm.date,
      check_in: manualForm.check_in,
      check_out: manualForm.check_out,
      work_mode: manualForm.work_mode,
    });
    setManualMode(false);
    setSelectedDate(manualForm.date);
  }

  function handleExport() {
    const headers = ['Employee', 'Department', 'Required hours', 'Logged hours', 'Variance', 'Status'];
    const rows = adminRows.map((row) => [
      row.employee.name,
      departments.find((d) => d.id === row.employee.department_id)?.name ?? 'Unknown',
      row.required.toFixed(1),
      row.logged.toFixed(1),
      row.variance.toFixed(1),
      row.variance < 0 ? 'Below target' : row.variance > 0 ? 'On track' : 'Check needed',
    ]);

    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${year}-${String(month).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Current month stats (till today)
  const currentMonthLogged = useMemo(() => {
    if (!targetEmployee) return 0;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return records
      .filter((r) => r.employee_id === targetEmployee.id && r.date.startsWith(monthStr) && r.date <= today)
      .reduce((sum, r) => sum + (hoursBetween(r.check_in, r.check_out) ?? 0), 0);
  }, [targetEmployee, records, year, month, today]);

  const currentMonthRequired = useMemo(() => {
    const today_date = new Date(today);
    let workingDays = 0;
    for (let d = 1; d <= today_date.getDate(); d += 1) {
      const date = new Date(year, month - 1, d);
      if (date.getDay() !== 0 && date.getDay() !== 6 && !holidaySet.has(date.toISOString().slice(0, 10))) {
        workingDays += 1;
      }
    }
    return workingDays * 9;
  }, [year, month, holidaySet, today]);

  const currentMonthVariance = currentMonthLogged - currentMonthRequired;

  // Previous month stats (full month)
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonthLogged = useMemo(() => {
    if (!targetEmployee) return 0;
    const monthStr = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
    return records
      .filter((r) => r.employee_id === targetEmployee.id && r.date.startsWith(monthStr))
      .reduce((sum, r) => sum + (hoursBetween(r.check_in, r.check_out) ?? 0), 0);
  }, [targetEmployee, records, previousMonth, previousYear]);

  const adminCards = [
    { label: 'Total employees', value: String(adminRows.length) },
    { label: 'On track', value: String(adminRows.filter((r) => r.variance >= 0).length) },
    { label: 'Below target', value: String(adminRows.filter((r) => r.variance < 0).length) },
    { label: 'Not logged today', value: String(adminRows.filter((r) => !r.hasToday).length) },
  ];

  const titleEmployee = targetEmployee ?? currentEmployee;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--status-present)' }}>
            Attendance
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            {titleEmployee ? `${titleEmployee.name} · Attendance` : 'Organization attendance'}
          </h1>
          {titleEmployee && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {titleEmployee.employee_code} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          )}
        </div>

        {isHRAdmin && (
          <div className="inline-flex items-center rounded-md border p-1" style={{ borderColor: 'var(--line-soft)', background: 'var(--paper)' }}>
            <button
              onClick={() => {
                setSelectedEmployeeId(null);
                setViewMode('my');
              }}
              className="px-3 py-1.5 text-xs font-medium"
              style={{
                background: viewMode === 'my' ? 'var(--ink)' : 'transparent',
                color: viewMode === 'my' ? '#fff' : 'var(--ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              My Attendance
            </button>
            <button
              onClick={() => {
                setSelectedEmployeeId(null);
                setViewMode('employee');
              }}
              className="px-3 py-1.5 text-xs font-medium"
              style={{
                background: viewMode === 'employee' ? 'var(--ink)' : 'transparent',
                color: viewMode === 'employee' ? '#fff' : 'var(--ink)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Employee Attendance
            </button>
          </div>
        )}
      </div>
      {showEmployeeList ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {adminCards.map((card) => (
              <div key={card.label} className="border bg-white p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
                <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
                <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Employee attendance</h3>
              <button onClick={handleExport} className="border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)' }}>
                Export CSV
              </button>
            </div>

            <div className="grid gap-3 border-b p-4 md:grid-cols-5" style={{ borderColor: 'var(--line-soft)' }}>
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>
                <option value="ALL">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.name}</option>
                ))}
              </select>
              <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>
                <option value="ALL">All employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>{MONTH_NAMES[value - 1]}</option>
                ))}
              </select>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>
                {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name" className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr style={{ background: 'var(--paper)' }}>
                    <th className="px-5 py-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Employee</th>
                    <th className="px-5 py-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Required</th>
                    <th className="px-5 py-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Logged</th>
                    <th className="px-5 py-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Variance</th>
                    <th className="px-5 py-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRows.map((row) => {
                    const varianceColorStyle = row.variance < 0 ? { background: '#FEE2E2', color: '#B91C1C' } : { background: '#DCFCE7', color: '#166534' };
                    const statusLabel = row.variance < 0 ? 'Below target' : row.variance > 0 ? 'On track' : 'Check needed';
                    return (
                      <tr key={row.employee.id} onClick={() => {
                        setSelectedEmployeeId(row.employee.id);
                        setViewMode('employee');
                      }} className="cursor-pointer border-t transition-colors hover:bg-[var(--paper)]" style={{ borderColor: 'var(--line-soft)' }}>
                        <td className="px-5 py-3 text-sm" style={{ color: 'var(--ink)' }}>{row.employee.name}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: 'var(--ink)' }}>{row.required.toFixed(1)}h</td>
                        <td className="px-5 py-3 text-sm" style={{ color: 'var(--ink)' }}>{row.logged.toFixed(1)}h</td>
                        <td className="px-5 py-3 text-sm" style={{ color: row.variance < 0 ? 'var(--status-absent)' : 'var(--status-present)' }}>
                          {row.variance >= 0 ? '+' : ''}{row.variance.toFixed(1)}h
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono px-2 py-1 text-[10px] uppercase" style={{ ...varianceColorStyle, borderRadius: 'var(--radius-sm)' }}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="border bg-white p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
              <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Current month (till today)</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{currentMonthLogged.toFixed(1)}h</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>of {currentMonthRequired.toFixed(1)}h required</p>
            </div>
            <div className="border bg-white p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
              <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Variance</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: currentMonthVariance >= 0 ? 'var(--status-present)' : 'var(--status-absent)' }}>
                {currentMonthVariance >= 0 ? '+' : ''}{currentMonthVariance.toFixed(1)}h
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {currentMonthVariance >= 0 ? 'ahead of target' : 'behind target'}
              </p>
            </div>
            <div className="border bg-white p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
              <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Previous month</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{previousMonthLogged.toFixed(1)}h</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{MONTH_NAMES[previousMonth - 1]} {previousYear}</p>
            </div>
            <div className="border bg-white p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
              <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Today's status</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: currentDayOpen ? 'var(--status-present)' : 'var(--ink)' }}>
                {currentDayOpen ? 'Working' : 'Off'}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{runningHoursToday.toFixed(1)}h logged</p>
            </div>
          </div>

          {/* Main Attendance Grid */}
          <div className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_0.95fr]">
            <div className="space-y-5">
              <div
                className="border p-5"
                style={{
                  borderColor: 'var(--line-soft)',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(13, 41, 65, 0.96), rgba(18, 60, 80, 0.96))',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Today
                    </p>
                    <p className="mt-2 text-lg font-semibold" style={{ color: '#fff' }}>
                      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {showEmployeeList ? null : (
                    <div className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium" style={{ borderColor: 'rgba(255,255,255,0.22)', color: '#fff', background: 'rgba(255,255,255,0.06)' }}>
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full" style={{ background: currentDayOpen ? '#34D399' : '#FBBF24' }} />
                      {currentDayOpen ? 'Currently working' : 'Not checked in'}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(255,255,255,0.72)' }}>
                      Running total
                    </p>
                    <p className="mt-2 text-4xl font-semibold leading-none" style={{ color: '#fff' }}>
                      {runningHoursToday.toFixed(1)}h
                    </p>
                  </div>

                  <button
                    onClick={currentDayOpen ? () => checkOut(targetEmployee!.id) : handleCheckIn}
                    className="px-5 py-3 text-sm font-semibold shadow-sm"
                    style={{ background: currentDayOpen ? '#F87171' : '#34D399', color: '#0f172a', borderRadius: 'var(--radius-sm)' }}
                  >
                    {location.status === 'locating' ? 'Locating…' : currentDayOpen ? 'Check out' : 'Check in'}
                  </button>
                </div>

                <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.18)' }}>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.7)' }}>Check-in</p>
                      <p className="mt-1 text-sm font-medium" style={{ color: '#fff' }}>{todaySessions[0]?.check_in ?? '—'}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.7)' }}>Sessions</p>
                      <p className="mt-1 text-sm font-medium" style={{ color: '#fff' }}>{todaySessions.length}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.7)' }}>Last out</p>
                      <p className="mt-1 text-sm font-medium" style={{ color: '#fff' }}>{lastCheckout}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.18)' }}>
                  <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.82)' }}>
                    <span className="font-mono uppercase tracking-[0.15em]">Sessions today</span>
                    <span className="font-semibold text-white">{todaySessions.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={workMode}
                      onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                      className="border px-2 py-1.5 text-xs"
                      style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                    >
                      {WORK_MODES.map((mode) => (
                        <option key={mode} value={mode} style={{ color: '#0f172a' }}>{mode}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        setManualForm((prev) => ({ ...prev, date: today }));
                        setManualMode(true);
                      }}
                      className="border px-3 py-2 text-xs font-medium"
                      style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                    >
                      Add session
                    </button>
                  </div>
                </div>
              </div>

              <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--line-soft)' }}>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>{monthLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="border px-2 py-1.5 text-sm"
                      style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                        <option key={value} value={value}>{MONTH_NAMES[value - 1]}</option>
                      ))}
                    </select>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="border px-2 py-1.5 text-sm"
                      style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                    >
                      {Array.from({ length: 5 }, (_, index) => new Date().getFullYear() - 2 + index).map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#22C55E' }} /> Present</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#F59E0B' }} /> Leave</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: '#8B5CF6' }} /> Holiday</span>
                  </div>
                </div>

                <div className="p-3">
                  <div className="grid grid-cols-7 gap-2 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="px-2 py-1 text-center">{day}</div>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {monthDays.map((day) => {
                      const iso = day.iso;
                      const isSelected = selectedDate === iso;
                      const isToday = iso === today;
                      const isMuted = !day.inMonth || day.iso.includes('-') === false;
                      const status = monthlyStatus.get(iso) ?? 'muted';
                      const dotColor = status === 'present' ? '#22C55E' : status === 'holiday' ? '#8B5CF6' : status === 'muted' ? '#94A3B8' : '#F59E0B';

                      return (
                        <button
                          key={iso}
                          onClick={() => setSelectedDate(iso)}
                          className="relative flex h-16 flex-col items-center justify-between rounded-md border p-1 text-left transition-colors"
                          style={{
                            borderColor: isSelected ? 'var(--accent-structure)' : isToday ? 'rgba(99, 102, 241, 0.5)' : 'var(--line-soft)',
                            background: isSelected ? 'rgba(100, 116, 139, 0.08)' : isToday ? 'rgba(99, 102, 241, 0.04)' : isMuted ? 'rgba(148,163,184,0.04)' : '#fff',
                            opacity: day.inMonth ? 1 : 0.45,
                          }}
                        >
                          <span className="text-[11px]" style={{ color: isToday ? 'var(--ink)' : 'var(--text-secondary)' }}>{day.day}</span>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <aside className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
              <div className="border-b px-4 py-3" style={{ borderColor: 'var(--line-soft)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>Day details</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
                    {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </h3>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{selectedDayTotal.toFixed(1)}h</span>
                </div>
              </div>

              <div className="space-y-3 p-4">
                {selectedDaySessions.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--text-secondary)' }}>
                    No sessions logged for this day.
                  </div>
                ) : (
                  selectedDaySessions.map((session, index) => (
                    <div key={session.id} className="rounded-md border p-3" style={{ borderColor: 'var(--line-soft)', background: 'var(--paper)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: 'var(--accent-structure-bg)', color: 'var(--accent-structure)' }}>
                            {index + 1}
                          </span>
                          <span className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
                            {session.work_mode}
                          </span>
                        </div>
                        <span className="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                          {hoursBetween(session.check_in, session.check_out)?.toFixed(1) ?? '0.0'}h
                        </span>
                      </div>
                      <div className="mt-3 font-mono text-sm" style={{ color: 'var(--ink)' }}>
                        {session.check_in ?? '—'} → {session.check_out ?? '—'}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t p-4" style={{ borderColor: 'var(--line-soft)' }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>Add a check-in for this day</p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (selectedDate === today) {
                        handleCheckIn();
                        return;
                      }
                      setManualForm((prev) => ({ ...prev, date: selectedDate }));
                      setManualMode(true);
                    }}
                    className="px-3 py-2 text-sm font-medium"
                    style={{ background: 'var(--status-present)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                  >
                    Check in
                  </button>
                  <button
                    onClick={() => {
                      setManualForm((prev) => ({ ...prev, date: selectedDate }));
                      setManualMode(true);
                    }}
                    className="border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    Manual entry
                  </button>
                </div>

                {manualMode && (
                  <form onSubmit={handleManualSave} className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--line-soft)' }}>
                    <input
                      type="date"
                      value={manualForm.date}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="w-full border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={manualForm.check_in}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, check_in: e.target.value }))}
                        className="border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                      />
                      <input
                        type="time"
                        value={manualForm.check_out}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, check_out: e.target.value }))}
                        className="border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                      />
                    </div>
                    <select
                      value={manualForm.work_mode}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, work_mode: e.target.value as WorkMode }))}
                      className="w-full border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                    >
                      {WORK_MODES.map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                    <button type="submit" className="w-full px-3 py-2 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>
                      Save entry
                    </button>
                  </form>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
