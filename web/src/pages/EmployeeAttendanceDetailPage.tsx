import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    daySessionsForMonth,
    hoursBetween,
    requiredHoursForMonth,
    STANDARD_HOURS_PER_DAY,
    totalHoursForMonth,
    useAttendance,
    type AttendanceRecord,
} from '../data/attendance';
import { useEmployees, type WorkMode } from '../data/employees';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WORK_MODES: WorkMode[] = ['OFFICE', 'WFH', 'HYBRID'];

function formatDateLabel(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function EmployeeAttendanceDetailPage() {
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const { employees } = useEmployees();
    const { records, addManualEntry } = useAttendance();

    const employee = employees.find((item) => item.id === params.employeeId) ?? null;
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1);
    const year = Number(searchParams.get('year') ?? new Date().getFullYear());

    const [manualMode, setManualMode] = useState(false);
    const [manualForm, setManualForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        check_in: '09:00',
        check_out: '18:00',
        work_mode: 'OFFICE' as WorkMode,
    });

    const sessionsByDay = useMemo(() => {
        if (!employee) return [] as Array<{ date: string; sessions: AttendanceRecord[]; total: number }>;
        return daySessionsForMonth(records, employee.id, year, month);
    }, [employee, records, year, month]);

    const required = requiredHoursForMonth(year, month, STANDARD_HOURS_PER_DAY);
    const logged = employee ? totalHoursForMonth(records, employee.id, year, month) : 0;
    const variance = Math.round((logged - required) * 10) / 10;

    function handleManualSave(event: React.FormEvent) {
        event.preventDefault();
        if (!employee) return;
        addManualEntry(employee.id, {
            date: manualForm.date,
            check_in: manualForm.check_in,
            check_out: manualForm.check_out,
            work_mode: manualForm.work_mode,
        });
        setManualMode(false);
    }

    if (!employee) {
        return (
            <div className="mx-auto max-w-xl rounded-xl border bg-white p-8" style={{ borderColor: 'var(--line-soft)' }}>
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Employee not found</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    The selected employee attendance record could not be loaded.
                </p>
                <button
                    onClick={() => navigate('/attendance')}
                    className="mt-5 px-4 py-2 text-sm font-medium"
                    style={{ background: 'var(--accent-holiday)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
                >
                    Back to attendance
                </button>
            </div>
        );
    }

    const visibleDateLabel = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    onClick={() => navigate('/attendance')}
                    className="font-mono text-[11px] uppercase tracking-wide hover:underline"
                    style={{ color: 'var(--accent-holiday)' }}
                >
                    ← Back to attendance
                </button>
                <button
                    onClick={() => setManualMode((prev) => !prev)}
                    className="border px-3 py-2 text-xs font-medium"
                    style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}
                >
                    {manualMode ? 'Close manual entry' : 'Add manual entry'}
                </button>
            </div>

            <div className="border bg-white p-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-3xl font-semibold" style={{ color: 'var(--ink)' }}>
                            {employee.name} <span style={{ color: 'var(--text-secondary)' }}>· Attendance</span>
                        </h1>
                        <p className="mt-2 font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                            {employee.employee_code} · {visibleDateLabel}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {MONTH_NAMES[month - 1]} {year}
                        </div>
                        <button
                            onClick={() => navigate('/attendance')}
                            className="border px-3 py-2 text-xs font-medium"
                            style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}
                        >
                            View all employee attendance
                        </button>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="border p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)' }}>
                        <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Required hours</p>
                        <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{required.toFixed(1)}h</p>
                    </div>
                    <div className="border p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)' }}>
                        <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Logged hours</p>
                        <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>{logged.toFixed(1)}h</p>
                    </div>
                    <div className="border p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)', background: variance < 0 ? '#FEF2F2' : '#F0FDF4' }}>
                        <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Variance</p>
                        <p className="mt-2 text-2xl font-semibold" style={{ color: variance < 0 ? '#B91C1C' : '#166534' }}>
                            {variance >= 0 ? '+' : ''}{variance.toFixed(1)}h
                        </p>
                    </div>
                </div>
            </div>

            {manualMode && (
                <form onSubmit={handleManualSave} className="grid gap-3 border bg-white p-4 md:grid-cols-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                    <input type="date" value={manualForm.date} onChange={(e) => setManualForm((prev) => ({ ...prev, date: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} />
                    <input type="time" value={manualForm.check_in} onChange={(e) => setManualForm((prev) => ({ ...prev, check_in: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} />
                    <input type="time" value={manualForm.check_out} onChange={(e) => setManualForm((prev) => ({ ...prev, check_out: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} />
                    <select value={manualForm.work_mode} onChange={(e) => setManualForm((prev) => ({ ...prev, work_mode: e.target.value as WorkMode }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>
                        {WORK_MODES.map((mode) => (
                            <option key={mode} value={mode}>{mode}</option>
                        ))}
                    </select>
                    <button type="submit" className="px-3 py-2 text-sm font-medium" style={{ background: 'var(--accent-holiday)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>
                        Save entry
                    </button>
                </form>
            )}

            <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Daily session breakdown</h2>
                </div>

                <div className="space-y-4 p-5">
                    {sessionsByDay.map((day) => (
                        <div key={day.date} className="border p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{formatDateLabel(day.date)}</p>
                                <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{day.total.toFixed(1)}h total</span>
                            </div>

                            {day.sessions.length === 0 ? (
                                <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions logged for this day.</p>
                            ) : (
                                <div className="mt-3 space-y-2">
                                    {day.sessions.map((session) => (
                                        <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 border p-2.5 text-sm" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
                                            <span className="font-mono" style={{ color: 'var(--ink)' }}>{session.check_in ?? '—'} → {session.check_out ?? '—'}</span>
                                            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{hoursBetween(session.check_in, session.check_out)?.toFixed(1) ?? '0.0'}h</span>
                                            <span className="font-mono px-2 py-0.5 text-[10px] uppercase" style={{ background: 'var(--accent-structure-bg)', color: 'var(--accent-structure)', borderRadius: 'var(--radius-sm)' }}>
                                                {session.work_mode}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
