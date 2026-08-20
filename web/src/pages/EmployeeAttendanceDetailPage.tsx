import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import {
    daySessionsForMonth,
    hoursBetween,
    requiredHoursForMonth,
    STANDARD_SHIFT_END,
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
        manual_entry_reason: '',
        early_checkout_reason: '',
        overtime_reason: '',
    });
    const [selectedDate, setSelectedDate] = useState(today);
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ check_in: '09:00', check_out: '18:00', work_mode: 'OFFICE' as WorkMode, reason: '', early_checkout_reason: '', overtime_reason: '' });
    const [historyVisible, setHistoryVisible] = useState(false);

    const sessionsByDay = useMemo(() => {
        if (!employee) return [] as Array<{ date: string; sessions: AttendanceRecord[]; total: number }>;
        return daySessionsForMonth(records, employee.id, year, month);
    }, [employee, records, year, month]);

    const todaySessions = useMemo(
        () => employee ? records.filter((record) => record.employee_id === employee.id && record.date === today).sort((a, b) => (a.check_in ?? '').localeCompare(b.check_in ?? '')) : [],
        [employee, records, today],
    );

    const required = requiredHoursForMonth(year, month, STANDARD_HOURS_PER_DAY);
    const logged = employee ? totalHoursForMonth(records, employee.id, year, month) : 0;
    const variance = Math.round((logged - required) * 10) / 10;

    const superAdminDays = useMemo(() => {
        if (!employee) return [] as Array<{ date: string; sessions: AttendanceRecord[]; total: number; status: string; overtime: number; hasManualEntry: boolean; hasEarlyCheckout: boolean; manualReason: string | null; earlyCheckoutReason: string | null; overtimeReason: string | null }>;
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
            const hasPunch = sessions.some((session) => session.check_in || session.check_out);
            const manualSessions = sessions.filter((session) => session.is_manual_entry);
            const earlySessions = sessions.filter((session) => session.is_early_checkout);
            const overtimeSession = sessions.find((session) => session.overtime_minutes > 0);
            const status = isFuture ? 'UPCOMING' : isHoliday ? 'HOLIDAY' : isLeave ? 'LEAVE' : hasPunch ? 'PRESENT' : isWeekend ? 'WEEKEND' : 'ABSENT';
            return { date, sessions, total, status, overtime: Math.max(0, total - 9 * 60), hasManualEntry: manualSessions.length > 0, hasEarlyCheckout: earlySessions.length > 0, manualReason: manualSessions.find((session) => session.manual_entry_reason)?.manual_entry_reason ?? null, earlyCheckoutReason: earlySessions.find((session) => session.early_checkout_reason)?.early_checkout_reason ?? null, overtimeReason: overtimeSession?.overtime_reason ?? null };
        }).sort((a, b) => a.date.localeCompare(b.date));
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
    const todayRowRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (month === new Date().getMonth() + 1 && year === new Date().getFullYear()) {
            todayRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }, [month, year]);

    function handleManualSave(event: React.FormEvent) {
        event.preventDefault();
        if (!employee) return;
        if (!manualForm.manual_entry_reason.trim()) return;
        if (manualForm.check_out < STANDARD_SHIFT_END && !manualForm.early_checkout_reason.trim()) return;
        const overtimeMinutes = Math.max(0, Math.round((hoursBetween(manualForm.check_in, manualForm.check_out) ?? 0) * 60) - STANDARD_HOURS_PER_DAY * 60);
        if (overtimeMinutes > 0 && !manualForm.overtime_reason.trim()) return;
        const saved = addManualEntry(employee.id, {
            date: manualForm.date,
            check_in: manualForm.check_in,
            check_out: manualForm.check_out,
            work_mode: manualForm.work_mode,
            manual_entry_reason: manualForm.manual_entry_reason,
            early_checkout_reason: manualForm.early_checkout_reason,
            overtime_reason: manualForm.overtime_reason,
        });
        if (saved) setManualMode(false);
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
        setEditForm({ check_in: record.check_in ?? '09:00', check_out: record.check_out ?? '18:00', work_mode: record.work_mode, reason: '', early_checkout_reason: record.early_checkout_reason ?? '', overtime_reason: record.overtime_reason ?? '' });
    }

    function saveEdit(event: React.FormEvent) {
        event.preventDefault();
        if (!editingRecordId || !editForm.reason.trim()) return;
        const overtimeMinutes = Math.max(0, Math.round((hoursBetween(editForm.check_in || null, editForm.check_out || null) ?? 0) * 60) - STANDARD_HOURS_PER_DAY * 60);
        const earlyCheckout = Boolean(editForm.check_out && editForm.check_out < STANDARD_SHIFT_END);
        if (earlyCheckout && !editForm.early_checkout_reason.trim()) return;
        if (overtimeMinutes > 0 && !editForm.overtime_reason.trim()) return;
        const saved = updateAttendanceRecord(editingRecordId, { check_in: editForm.check_in || null, check_out: editForm.check_out || null, work_mode: editForm.work_mode, early_checkout_reason: editForm.early_checkout_reason, overtime_reason: editForm.overtime_reason }, editForm.reason);
        if (saved) setEditingRecordId(null);
        setEditForm((prev) => ({ ...prev, reason: '' }));
    }

    if (role === 'SUPER_ADMIN' || role === 'HR') {
        const canManage = role === 'SUPER_ADMIN' || role === 'HR';
        const selectedStatus = selectedSuperDay?.status ?? 'UPCOMING';
        const statusColor = selectedStatus === 'PRESENT' ? 'var(--status-present)' : selectedStatus === 'LEAVE' ? '#F59E0B' : selectedStatus === 'HOLIDAY' ? '#8B5CF6' : selectedStatus === 'ABSENT' ? 'var(--status-absent)' : 'var(--text-muted)';
        return (
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <button onClick={() => navigate(`/attendance?month=${month}&year=${year}`)} className="font-mono text-[11px] uppercase tracking-wide hover:underline" style={{ color: 'var(--accent-holiday)' }}>← Back to Employee Attendance</button>
                    {canManage && <button onClick={() => { setManualForm((prev) => ({ ...prev, date: selectedSuperDay?.date ?? today })); setManualMode((prev) => !prev); }} className="border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>{manualMode ? 'Close form' : 'Add attendance'}</button>}
                </div>

                <div className="border bg-white p-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-semibold" style={{ color: 'var(--ink)' }}>{employee.name} <span style={{ color: 'var(--text-secondary)' }}>· Attendance</span></h1><p className="mt-2 font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{employee.employee_code} · {MONTH_NAMES[month - 1]} {year}</p></div><span className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Super Admin view</span></div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {[['Required Hours', formatDuration(superAdminSummary.requiredMinutes)], ['Worked Hours', formatDuration(superAdminSummary.workedMinutes)], ['Overtime', formatDuration(superAdminSummary.overtime)], ['Shortfall', formatDuration(superAdminSummary.shortfall)], ['Attendance %', `${superAdminSummary.attendance.toFixed(1)}%`], ['Present Days', String(superAdminSummary.presentDays)], ['Absent Days', String(superAdminSummary.absentDays)], ['Leave Days', String(superAdminSummary.leaveDays)], ['WFH Days', String(superAdminSummary.wfhDays)]].map(([label, value]) => <div key={label} className="border p-3" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)', background: 'var(--paper)' }}><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</p><p className="mt-1 text-lg font-semibold" style={{ color: 'var(--ink)' }}>{value}</p></div>)}
                    </div>
                </div>

                {canManage && manualMode && <form onSubmit={(event) => { event.preventDefault(); if (!manualForm.date || !manualForm.check_in || !manualForm.check_out || !manualForm.manual_entry_reason.trim()) return; const saved = addManualEntry(employee.id, manualForm); if (saved) { setManualMode(false); setSelectedDate(manualForm.date); } }} className="grid gap-3 border bg-white p-4 md:grid-cols-3" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}><input type="date" value={manualForm.date} onChange={(e) => setManualForm((prev) => ({ ...prev, date: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><input type="time" value={manualForm.check_in} onChange={(e) => setManualForm((prev) => ({ ...prev, check_in: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><input type="time" value={manualForm.check_out} onChange={(e) => setManualForm((prev) => ({ ...prev, check_out: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><select value={manualForm.work_mode} onChange={(e) => setManualForm((prev) => ({ ...prev, work_mode: e.target.value as WorkMode }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>{WORK_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select><input required value={manualForm.manual_entry_reason} onChange={(e) => setManualForm((prev) => ({ ...prev, manual_entry_reason: e.target.value }))} placeholder="Reason for manual entry" className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><input value={manualForm.early_checkout_reason} onChange={(e) => setManualForm((prev) => ({ ...prev, early_checkout_reason: e.target.value }))} placeholder={`Early checkout reason (before ${STANDARD_SHIFT_END})`} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><input value={manualForm.overtime_reason} onChange={(e) => setManualForm((prev) => ({ ...prev, overtime_reason: e.target.value }))} placeholder="Overtime reason (if applicable)" className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><button type="submit" className="px-3 py-2 text-sm font-medium" style={{ background: 'var(--accent-holiday)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Add attendance</button></form>}

                <div className="grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
                    <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                        <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Monthly attendance</h2></div>
                        <div className="max-h-[620px] divide-y overflow-y-auto" style={{ borderColor: 'var(--line-soft)' }}>{superAdminDays.map((day) => {
                            const isToday = day.date === today;
                            const statusColor = day.status === 'PRESENT' ? 'var(--status-present)' : day.status === 'LEAVE' ? '#F59E0B' : day.status === 'HOLIDAY' ? '#8B5CF6' : day.status === 'ABSENT' ? 'var(--status-absent)' : 'var(--text-muted)';
                            const isWorkingDay = day.status === 'PRESENT' || day.status === 'LEAVE';
                            const firstSession = day.sessions[0];
                            const lastSession = day.sessions[day.sessions.length - 1];
                            return <button key={day.date} ref={isToday ? todayRowRef : undefined} onClick={() => setSelectedDate(day.date)} className="grid w-full gap-2 px-5 py-3 text-left transition-colors hover:bg-[var(--paper)] md:grid-cols-[8rem_7rem_minmax(9rem,1fr)_5rem_minmax(8rem,1.4fr)] md:items-center" style={{ background: selectedSuperDay?.date === day.date ? 'rgba(100, 116, 139, 0.08)' : isToday ? 'rgba(96, 165, 250, 0.10)' : '#fff', borderLeft: isToday ? '3px solid #60A5FA' : '3px solid transparent' }}><span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}{isToday && <span className="ml-2 inline-flex border px-1.5 py-0.5 align-middle font-mono text-[9px] font-semibold tracking-wide" style={{ borderColor: '#60A5FA', color: '#2563EB', borderRadius: 'var(--radius-sm)' }}>TODAY</span>}</span><span className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: statusColor }}><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: statusColor }} />{day.status}</span>{isWorkingDay && day.sessions.length > 0 ? <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{formatTime(firstSession?.check_in ?? null)} → {formatTime(lastSession?.check_out ?? null)}</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}{isWorkingDay && day.total > 0 ? <span className="font-mono text-xs font-medium" style={{ color: 'var(--ink)' }}>{formatDuration(Math.round(day.total))}</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}<span className="flex flex-wrap gap-1.5">{day.hasManualEntry && <span className="border px-1.5 py-0.5 font-mono text-[9px] uppercase" style={{ borderColor: '#D97706', color: '#B45309', borderRadius: 'var(--radius-sm)' }}>Manual</span>}{day.hasEarlyCheckout && <span className="border px-1.5 py-0.5 font-mono text-[9px] uppercase" style={{ borderColor: '#FCA5A5', color: '#B91C1C', borderRadius: 'var(--radius-sm)' }}>Early checkout</span>}{day.overtime > 0 && <span className="border px-1.5 py-0.5 font-mono text-[9px] uppercase" style={{ borderColor: '#FBBF24', color: '#B45309', borderRadius: 'var(--radius-sm)' }}>OT +{formatDuration(day.overtime)}</span>}</span></button>;
                        })}</div>
                    </div>

                    <aside className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}><div className="border-b px-4 py-3" style={{ borderColor: 'var(--line-soft)' }}><p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>Day details</p><h3 className="mt-1 text-base font-semibold" style={{ color: 'var(--ink)' }}>{selectedSuperDay ? formatDateLabel(selectedSuperDay.date) : 'No date selected'}</h3></div><div className="space-y-4 p-4"><div className="grid grid-cols-2 gap-3"><div><p className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>Status</p><p className="mt-1 text-sm font-semibold" style={{ color: statusColor }}>{selectedStatus}</p></div><div><p className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>Total</p><p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{formatDuration(selectedSuperDay?.total ?? 0)}</p></div><div><p className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>Work mode</p><p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{selectedSuperDay?.sessions[0]?.work_mode ?? '—'}</p></div><div><p className="font-mono text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>Sessions</p><p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{selectedSuperDay?.sessions.length ?? 0}</p></div></div><div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Sessions</p>{selectedSuperDay?.sessions.length ? <div className="mt-2 space-y-2">{selectedSuperDay.sessions.map((session) => <div key={session.id} className="flex items-center justify-between gap-2 border p-2.5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}><span className="font-mono text-xs">{formatTime(session.check_in)} → {formatTime(session.check_out)}</span><button onClick={() => openEdit(session)} className="border px-2 py-1 text-[10px] uppercase" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>Edit</button></div>)}</div> : <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions logged for this day.</p>}</div><button onClick={() => { setManualForm((prev) => ({ ...prev, date: selectedSuperDay?.date ?? today })); setManualMode(true); }} className="w-full border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>Add missing punch</button><button onClick={() => setHistoryVisible((prev) => !prev)} className="w-full border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>{historyVisible ? 'Hide attendance history' : 'View attendance history'}</button>{historyVisible && <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--line-soft)' }}>{selectedAudit.length ? selectedAudit.map((entry) => <div key={entry.id} className="text-xs" style={{ color: 'var(--text-secondary)' }}><p className="font-semibold" style={{ color: 'var(--ink)' }}>Changed By: {entry.changed_by}</p><p>Changed On: {entry.changed_on}</p><p className="mt-1">Previous: {formatTime(entry.previous_check_in)} → {formatTime(entry.previous_check_out)}</p><p>Updated: {formatTime(entry.updated_check_in)} → {formatTime(entry.updated_check_out)}</p><p>Reason: {entry.reason}</p></div>) : <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No changes recorded.</p>}</div>}</div></aside>
                </div>

                {editingRecordId && <form onSubmit={saveEdit} className="border bg-white p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}><div className="flex items-center justify-between"><h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Edit Attendance</h2><button type="button" onClick={() => setEditingRecordId(null)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cancel</button></div><div className="mt-3 grid gap-3 md:grid-cols-2"><input type="time" value={editForm.check_in} onChange={(e) => setEditForm((prev) => ({ ...prev, check_in: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><input type="time" value={editForm.check_out} onChange={(e) => setEditForm((prev) => ({ ...prev, check_out: e.target.value }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /><select value={editForm.work_mode} onChange={(e) => setEditForm((prev) => ({ ...prev, work_mode: e.target.value as WorkMode }))} className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>{WORK_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select><input required value={editForm.reason} onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason for correction" className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} />{editForm.check_out < STANDARD_SHIFT_END && <input required value={editForm.early_checkout_reason} onChange={(e) => setEditForm((prev) => ({ ...prev, early_checkout_reason: e.target.value }))} placeholder="Early checkout reason" className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} />}{(Math.max(0, Math.round((hoursBetween(editForm.check_in, editForm.check_out) ?? 0) * 60) - STANDARD_HOURS_PER_DAY * 60) > 0) && <input required value={editForm.overtime_reason} onChange={(e) => setEditForm((prev) => ({ ...prev, overtime_reason: e.target.value }))} placeholder="Overtime reason" className="border px-3 py-2 text-sm" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} />}</div><button type="submit" className="mt-3 px-3 py-2 text-xs font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Save Changes</button></form>}
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

            {(() => {
                const renderDay = (date: string, sessions: AttendanceRecord[], total: number, heading: string) => {
                    const status = sessions.length ? 'PRESENT' : 'ABSENT';
                    const statusColor = status === 'PRESENT' ? 'var(--status-present)' : 'var(--status-absent)';
                    return <div className="border p-4" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{heading}</p><p className="mt-1 text-sm font-semibold" style={{ color: 'var(--ink)' }}>{formatDateLabel(date)}</p></div>
                            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: statusColor }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor }} />{status}</span>
                        </div>
                        {sessions.length ? <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{sessions.map((session) => {
                            const early = session.is_early_checkout;
                            const overtime = session.overtime_minutes > 0;
                            return <div key={session.id} className="border p-3" style={{ borderColor: 'var(--line-soft)', background: 'var(--paper)', borderRadius: 'var(--radius-sm)' }}>
                                <div className="flex items-center justify-between gap-2"><span className="font-mono text-sm" style={{ color: 'var(--ink)' }}>{formatTime(session.check_in)} → {formatTime(session.check_out)}</span><span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDuration(sessionMinutes(session))}</span></div>
                                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><span style={{ color: 'var(--text-secondary)' }}>Work mode</span><span className="text-right font-medium" style={{ color: 'var(--ink)' }}>{session.work_mode}</span><span style={{ color: 'var(--text-secondary)' }}>Manual entry</span><span className="text-right font-medium" style={{ color: session.is_manual_entry ? '#B45309' : 'var(--ink)' }}>{session.is_manual_entry ? 'Yes' : 'No'}</span>{session.is_manual_entry && <><span style={{ color: 'var(--text-secondary)' }}>Manual reason</span><span className="text-right" style={{ color: 'var(--ink)' }}>{session.manual_entry_reason || 'Missing reason'}</span></>}{early && <><span style={{ color: '#B91C1C' }}>Early checkout</span><span className="text-right" style={{ color: '#B91C1C' }}>{session.early_checkout_reason || 'Missing reason'}</span></>}{overtime && <><span style={{ color: '#B45309' }}>Overtime</span><span className="text-right" style={{ color: '#B45309' }}>+{formatDuration(session.overtime_minutes)}</span><span style={{ color: 'var(--text-secondary)' }}>OT reason</span><span className="text-right" style={{ color: 'var(--ink)' }}>{session.overtime_reason || 'Missing reason'}</span><span style={{ color: 'var(--text-secondary)' }}>Approval</span><span className="text-right font-medium" style={{ color: session.overtime_approval_status === 'approved' ? '#166534' : '#B45309' }}>{session.overtime_approval_status ?? 'pending'}{session.overtime_approved_by ? ` · ${session.overtime_approved_by}` : ''}</span></>}</div>
                            </div>;
                        })}</div> : <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>No sessions logged for this day.</p>}
                        <p className="mt-3 text-right font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{total.toFixed(1)}h total</p>
                    </div>;
                };
                const todayTotal = todaySessions.reduce((sum, session) => sum + sessionMinutes(session), 0);
                return <div className="space-y-4">
                    {renderDay(today, todaySessions, todayTotal, 'Today')}
                    <button onClick={() => setHistoryVisible((prev) => !prev)} className="w-full border bg-white px-4 py-3 text-left text-sm font-semibold" style={{ borderColor: 'var(--line-soft)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>{historyVisible ? 'Hide full month history' : 'View full month history'}<span className="float-right font-mono text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>{MONTH_NAMES[month - 1]} {year} · {historyVisible ? 'Collapse' : 'Expand'}</span></button>
                    {historyVisible && <div className="space-y-4">{sessionsByDay.filter((day) => day.date !== today).map((day) => renderDay(day.date, day.sessions, day.total, 'History'))}</div>}
                </div>;
            })()}
        </div>
    );
}
