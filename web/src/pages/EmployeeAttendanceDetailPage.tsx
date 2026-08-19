import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
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
import { useHolidays } from '../data/holidays';
import { useLeaveRequests } from '../data/leave';
import type { Role } from '../data/roles';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WORK_MODES: WorkMode[] = ['OFFICE', 'WFH', 'HYBRID'];

type Context = { role: Role };

function formatDuration(minutes: number): string {
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function sessionMinutes(session: AttendanceRecord): number {
    return Math.round((hoursBetween(session.check_in, session.check_out) ?? 0) * 60);
}

function formatTime(time: string | null): string {
    if (!time) return '—';
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

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
    const { role } = useOutletContext<Context>();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const { employees } = useEmployees();
    const { records, addManualEntry, updateAttendanceRecord, audit, today } = useAttendance();
    const { holidays } = useHolidays();
    const { requests: leaveRequests } = useLeaveRequests();

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
    const [selectedDate, setSelectedDate] = useState(today);
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ check_in: '09:00', check_out: '18:00', work_mode: 'OFFICE' as WorkMode, reason: '' });
    const [historyVisible, setHistoryVisible] = useState(false);

    const sessionsByDay = useMemo(() => {
        if (!employee) return [] as Array<{ date: string; sessions: AttendanceRecord[]; total: number }>;
        return daySessionsForMonth(records, employee.id, year, month);
    }, [employee, records, year, month]);

    const required = requiredHoursForMonth(year, month, STANDARD_HOURS_PER_DAY);
    const logged = employee ? totalHoursForMonth(records, employee.id, year, month) : 0;
    const variance = Math.round((logged - required) * 10) / 10;

    const superAdminDays = useMemo(() => {
        if (!employee) return [] as Array<{ date: string; sessions: AttendanceRecord[]; total: number; status: string; overtime: number }>;
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        const lastDay = new Date(year, month, 0).getDate();
        return Array.from({ length: lastDay }, (_, index) => {
            const date = `${prefix}-${String(index + 1).padStart(2, '0')}`;
            const sessions = records.filter((record) => record.employee_id === employee.id && record.date === date).sort((a, b) => (a.check_in ?? '').localeCompare(b.check_in ?? ''));
            const total = sessions.reduce((sum, session) => sum + sessionMinutes(session), 0);
            const isFuture = date > today;
            const isHoliday = holidays.some((holiday) => holiday.date === date);
            const isLeave = leaveRequests.some((request) => request.employee_id === employee.id && request.status === 'APPROVED' && date >= request.start_date && date <= request.end_date);
            const isWeekend = [0, 6].includes(new Date(`${date}T00:00:00`).getDay());
            const status = isFuture ? 'UPCOMING' : isHoliday ? 'HOLIDAY' : isLeave ? 'LEAVE' : sessions.length > 0 ? 'PRESENT' : isWeekend ? 'WEEKEND' : 'ABSENT';
            return { date, sessions, total, status, overtime: Math.max(0, total - 9 * 60) };
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [employee, records, year, month, holidays, leaveRequests, today]);

    const superAdminSummary = useMemo(() => {
        const completed = superAdminDays.filter((day) => day.date <= today);
        const requiredDays = completed.filter((day) => day.status !== 'HOLIDAY' && day.status !== 'WEEKEND').length;
        const requiredMinutes = requiredDays * 9 * 60;
        const workedMinutes = completed.reduce((sum, day) => sum + day.total, 0);
        const presentDays = completed.filter((day) => day.status === 'PRESENT').length;
        const absentDays = completed.filter((day) => day.status === 'ABSENT').length;
        const leaveDays = completed.filter((day) => day.status === 'LEAVE').length;
        const wfhDays = completed.filter((day) => day.sessions.some((session) => session.work_mode === 'WFH')).length;
        return { requiredMinutes, workedMinutes, overtime: Math.max(0, workedMinutes - requiredMinutes), shortfall: Math.max(0, requiredMinutes - workedMinutes), attendance: requiredDays ? Math.min(100, (presentDays / requiredDays) * 100) : 0, presentDays, absentDays, leaveDays, wfhDays };
    }, [superAdminDays, today]);

    const selectedSuperDay = superAdminDays.find((day) => day.date === selectedDate) ?? superAdminDays[0];
    const selectedAudit = audit.filter((entry) => selectedSuperDay?.sessions.some((session) => session.id === entry.record_id));

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

    function openEdit(record: AttendanceRecord) {
        setEditingRecordId(record.id);
        setEditForm({ check_in: record.check_in ?? '09:00', check_out: record.check_out ?? '18:00', work_mode: record.work_mode, reason: '' });
    }

    function saveEdit(event: React.FormEvent) {
        event.preventDefault();
        if (!editingRecordId || !editForm.reason.trim()) return;
        updateAttendanceRecord(editingRecordId, { check_in: editForm.check_in || null, check_out: editForm.check_out || null, work_mode: editForm.work_mode }, editForm.reason);
        setEditingRecordId(null);
        setEditForm((prev) => ({ ...prev, reason: '' }));
    }

    if (role === 'SUPER_ADMIN') {
        const selectedStatus = selectedSuperDay?.status ?? 'UPCOMING';
        const statusColor = selectedStatus === 'PRESENT' ? 'var(--status-present)' : selectedStatus === 'LEAVE' ? '#F59E0B' : selectedStatus === 'HOLIDAY' ? '#8B5CF6' : selectedStatus === 'ABSENT' ? 'var(--status-absent)' : 'var(--text-muted)';
        return (
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button onClick={() => navigate(`/attendance?month=${month}&year=${year}`)} className="font-mono text-[11px] uppercase tracking-wide hover:underline" style={{ color: 'var(--accent-holiday)' }}>← Back to Employee Attendance</button>
                    <button onClick={() => { setManualForm((prev) => ({ ...prev, date: selectedSuperDay?.date ?? today })); setManualMode((prev) => !prev); }} className="border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>{manualMode ? 'Close form' : 'Add attendance'}</button>
                </div>

                <div className="border bg-white p-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-semibold" style={{ color: 'var(--ink)' }}>{employee.name} <span style={{ color: 'var(--text-secondary)' }}>· Attendance</span></h1><p className="mt-2 font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{employee.employee_code} · {MONTH_NAMES[month - 1]} {year}</p></div><span className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Super Admin view</span></div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {[['Required Hours', formatDuration(superAdminSummary.requiredMinutes)], ['Worked Hours', formatDuration(superAdminSummary.workedMinutes)], ['Overtime', formatDuration(superAdminSummary.overtime)], ['Shortfall', formatDuration(superAdminSummary.shortfall)], ['Attendance %', `${superAdminSummary.attendance.toFixed(1)}%`], ['Present Days', String(superAdminSummary.presentDays)], ['Absent Days', String(superAdminSummary.absentDays)], ['Leave Days', String(superAdminSummary.leaveDays)], ['WFH Days', String(superAdminSummary.wfhDays)]].map(([label, value]) => <div key={label} className="border p-3" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)' }}><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</p><p className="mt-1 text-lg font-semibold" style={{ color: 'var(--ink)' }}>{value}</p></div>)}
                    </div>
                </div>

                {manualMode && <form onSubmit={(event) => { event.preventDefault(); if (!manualForm.date || !manualForm.check_in || !manualForm.check_out) return; addManualEntry(employee.id, manualForm); setManualMode(false); setSelectedDate(manualForm.date); }} className="grid gap-3 border bg-white p-4 md:grid-cols-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}><input type="date" value={manualForm.date} onChange={(e) => setManualForm((prev) => ({ ...prev, date: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><input type="time" value={manualForm.check_in} onChange={(e) => setManualForm((prev) => ({ ...prev, check_in: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><input type="time" value={manualForm.check_out} onChange={(e) => setManualForm((prev) => ({ ...prev, check_out: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><select value={manualForm.work_mode} onChange={(e) => setManualForm((prev) => ({ ...prev, work_mode: e.target.value as WorkMode }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>{WORK_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select><button type="submit" className="px-3 py-2 text-sm font-medium" style={{ background: 'var(--accent-holiday)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Add attendance</button></form>}

                <div className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
                    <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                        <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Monthly attendance</h2></div>
                        <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>{superAdminDays.map((day) => <button key={day.date} onClick={() => setSelectedDate(day.date)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--paper)]" style={{ background: selectedSuperDay?.date === day.date ? 'rgba(100, 116, 139, 0.08)' : '#fff' }}><span className="w-28 shrink-0 text-sm font-medium" style={{ color: 'var(--ink)' }}>{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span><span className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: day.status === 'PRESENT' ? 'var(--status-present)' : day.status === 'LEAVE' ? '#F59E0B' : day.status === 'HOLIDAY' ? '#8B5CF6' : day.status === 'ABSENT' ? 'var(--status-absent)' : 'var(--text-muted)' }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: day.status === 'PRESENT' ? 'var(--status-present)' : day.status === 'LEAVE' ? '#F59E0B' : day.status === 'HOLIDAY' ? '#8B5CF6' : day.status === 'ABSENT' ? 'var(--status-absent)' : 'var(--text-muted)' }} />{day.status}</span><span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{day.sessions[0] ? `${formatTime(day.sessions[0].check_in)} → ${formatTime(day.sessions[day.sessions.length - 1].check_out)}` : '—'}</span><span className="ml-auto shrink-0 font-mono text-xs" style={{ color: day.total ? 'var(--ink)' : 'var(--text-muted)' }}>{day.total ? formatDuration(day.total) : '—'}</span><span className="w-16 shrink-0 text-right font-mono text-xs" style={{ color: day.overtime ? 'var(--status-present)' : 'var(--text-muted)' }}>{day.overtime ? `+${formatDuration(day.overtime)}` : '—'}</span></button>)}</div>
                    </div>

                    <aside className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}><div className="border-b px-4 py-3" style={{ borderColor: 'var(--line-soft)' }}><p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>Day details</p><h3 className="mt-1 text-base font-semibold" style={{ color: 'var(--ink)' }}>{selectedSuperDay ? formatDateLabel(selectedSuperDay.date) : 'No date selected'}</h3></div><div className="space-y-4 p-4"><div className="grid grid-cols-2 gap-3"><div><p className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>Status</p><p className="mt-1 text-sm font-semibold" style={{ color: statusColor }}>{selectedStatus}</p></div><div><p className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>Total</p><p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{formatDuration(selectedSuperDay?.total ?? 0)}</p></div><div><p className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>Work mode</p><p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{selectedSuperDay?.sessions[0]?.work_mode ?? '—'}</p></div><div><p className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>Sessions</p><p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{selectedSuperDay?.sessions.length ?? 0}</p></div></div><div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sessions</p>{selectedSuperDay?.sessions.length ? <div className="mt-2 space-y-2">{selectedSuperDay.sessions.map((session) => <div key={session.id} className="flex items-center justify-between gap-2 border p-2.5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}><span className="font-mono text-xs">{formatTime(session.check_in)} → {formatTime(session.check_out)}</span><button onClick={() => openEdit(session)} className="border px-2 py-1 text-[10px] uppercase" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>Edit</button></div>)}</div> : <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions logged for this day.</p>}</div><button onClick={() => { setManualForm((prev) => ({ ...prev, date: selectedSuperDay?.date ?? today })); setManualMode(true); }} className="w-full border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>Add missing punch</button><button onClick={() => setHistoryVisible((prev) => !prev)} className="w-full border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>{historyVisible ? 'Hide attendance history' : 'View attendance history'}</button>{historyVisible && <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--line-soft)' }}>{selectedAudit.length ? selectedAudit.map((entry) => <div key={entry.id} className="text-xs" style={{ color: 'var(--text-secondary)' }}><p className="font-semibold" style={{ color: 'var(--ink)' }}>Changed By: {entry.changed_by}</p><p>Changed On: {entry.changed_on}</p><p className="mt-1">Previous: {formatTime(entry.previous_check_in)} → {formatTime(entry.previous_check_out)}</p><p>Updated: {formatTime(entry.updated_check_in)} → {formatTime(entry.updated_check_out)}</p><p>Reason: {entry.reason}</p></div>) : <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No changes recorded.</p>}</div>}</div></aside>
                </div>

                {editingRecordId && <form onSubmit={saveEdit} className="border bg-white p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}><div className="flex items-center justify-between"><h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Edit Attendance</h2><button type="button" onClick={() => setEditingRecordId(null)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cancel</button></div><div className="mt-3 grid gap-3 md:grid-cols-4"><input type="time" value={editForm.check_in} onChange={(e) => setEditForm((prev) => ({ ...prev, check_in: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><input type="time" value={editForm.check_out} onChange={(e) => setEditForm((prev) => ({ ...prev, check_out: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><select value={editForm.work_mode} onChange={(e) => setEditForm((prev) => ({ ...prev, work_mode: e.target.value as WorkMode }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>{WORK_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select><input required value={editForm.reason} onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason for correction" className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /></div><button type="submit" className="mt-3 px-3 py-2 text-xs font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Save Changes</button></form>}
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
