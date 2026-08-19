import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useClients } from '../data/clients';
import { useEmployees } from '../data/employees';
import { useProjects } from '../data/projects';
import { useTasks, type TaskPriority, type TaskStatus } from '../data/tasks';
import { useUsers } from '../data/users';
import type { Role } from '../data/roles';

type Context = { role: Role };

const STATUS_LABEL: Record<TaskStatus, string> = { TODO: 'To do', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' };
const STATUS_COLOR: Record<TaskStatus, string> = { TODO: 'var(--status-neutral)', IN_PROGRESS: 'var(--status-pending)', COMPLETED: 'var(--status-present)' };
const PRIORITY_LABEL: Record<TaskPriority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };
const PRIORITY_COLOR: Record<TaskPriority, string> = { LOW: 'var(--status-neutral)', MEDIUM: 'var(--status-pending)', HIGH: 'var(--status-absent)' };
const inputStyle = { borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' } as const;

function formatTimestamp(value: string): string {
    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function TaskDetailsPage() {
    const navigate = useNavigate();
    const { role } = useOutletContext<Context>();
    const { id } = useParams();
    const { employees } = useEmployees();
    const { clients } = useClients();
    const { projects } = useProjects();
    const { users } = useUsers();
    const { tasks, setStatus, timeEntries, comments, logTime, addComment } = useTasks();
    const task = tasks.find((item) => item.id === id) ?? null;
    const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(task?.status ?? 'TODO');
    const [hoursInput, setHoursInput] = useState('');
    const [commentInput, setCommentInput] = useState('');

    const assigneeName = task ? employees.find((employee) => employee.id === task.assigned_to)?.name ?? 'Unknown' : 'Unknown';
    const clientName = task ? clients.find((client) => client.id === task.client_id)?.name : undefined;
    const projectName = task ? projects.find((project) => project.id === task.project_id)?.name : undefined;
    const currentUser = users.find((user) => user.role === role)?.name ?? 'Current user';
    const taskTimeEntries = useMemo(() => timeEntries.filter((entry) => entry.task_id === id).sort((a, b) => a.date.localeCompare(b.date)), [timeEntries, id]);
    const taskComments = useMemo(() => comments.filter((comment) => comment.task_id === id).sort((a, b) => a.timestamp.localeCompare(b.timestamp)), [comments, id]);

    if (!task) {
        return (
            <div className="mx-auto max-w-xl border bg-white p-8" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Task not found</h1>
                <button onClick={() => navigate('/tasks')} className="mt-5 px-4 py-2 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Back to tasks</button>
            </div>
        );
    }

    function handleLogTime() {
        if (!task) return;
        const hours = Number(hoursInput);
        if (!Number.isFinite(hours) || hours <= 0) return;
        logTime(task.id, hours, currentUser);
        setHoursInput('');
    }

    function handlePostComment() {
        if (!task) return;
        if (!commentInput.trim()) return;
        addComment(task.id, currentUser, commentInput);
        setCommentInput('');
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <button onClick={() => navigate('/tasks')} className="font-mono text-[11px] uppercase tracking-wide hover:underline" style={{ color: 'var(--accent-holiday)' }}>← Back to tasks</button>

            <section className="border bg-white p-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--status-pending)' }}>Task details</p>
                        <h1 className="font-display mt-1 text-3xl font-semibold" style={{ color: 'var(--ink)' }}>{task.title}</h1>
                        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Assigned to {assigneeName}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="font-mono px-2 py-1 text-[11px] uppercase" style={{ background: `${STATUS_COLOR[task.status]}20`, color: STATUS_COLOR[task.status], borderRadius: 'var(--radius-sm)' }}>{STATUS_LABEL[task.status]}</span>
                        <span className="font-mono px-2 py-1 text-[11px] uppercase" style={{ background: `${PRIORITY_COLOR[task.priority]}20`, color: PRIORITY_COLOR[task.priority], borderRadius: 'var(--radius-sm)' }}>{PRIORITY_LABEL[task.priority]}</span>
                    </div>
                </div>
            </section>

            <section className="border bg-white p-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Details</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>{task.description || 'No description provided.'}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Due date</p><p className="mt-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>{task.due_date}</p></div>
                    <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Estimated hours</p><p className="mt-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>{task.estimated_hours}h</p></div>
                    <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Logged hours</p><p className="mt-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>{task.worked_hours}h</p></div>
                    <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Project / Client</p><p className="mt-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>{projectName && clientName ? `${projectName} · ${clientName}` : 'Not linked'}</p></div>
                </div>
            </section>

            <section className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Time log</h2></div>
                <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
                    {taskTimeEntries.length === 0 ? <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>No time entries yet.</p> : taskTimeEntries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><span style={{ color: 'var(--ink)' }}>{entry.date}</span><span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{entry.hours}h</span><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Logged by {entry.logged_by}</span></div>)}
                </div>
                <div className="flex gap-2 border-t p-4" style={{ borderColor: 'var(--line-soft)' }}><input type="number" min="0.5" step="0.5" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)} placeholder="Hours" className="w-32 border px-3 py-2 text-sm" style={inputStyle} /><button onClick={handleLogTime} className="px-3 py-2 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Log</button></div>
            </section>

            <section className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Comments</h2></div>
                <div className="space-y-4 p-5">{taskComments.length === 0 ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No comments yet</p> : taskComments.map((comment) => <div key={comment.id} className="border-l-2 pl-3" style={{ borderColor: 'var(--line-soft)' }}><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{comment.commenter}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatTimestamp(comment.timestamp)}</span></div><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{comment.text}</p></div>)}</div>
                <div className="border-t p-4" style={{ borderColor: 'var(--line-soft)' }}><textarea value={commentInput} onChange={(e) => setCommentInput(e.target.value)} rows={3} placeholder="Write a comment" className="w-full resize-none border px-3 py-2 text-sm" style={inputStyle} /><button onClick={handlePostComment} className="mt-2 px-3 py-2 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Post Comment</button></div>
            </section>

            <section className="border bg-white p-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Actions</h2>
                <div className="mt-3 flex flex-wrap items-end gap-3"><label className="block"><span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Status</span><select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as TaskStatus)} className="mt-1.5 block border px-3 py-2 text-sm" style={inputStyle}><option value="TODO">To do</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></label><button onClick={() => { setStatus(task.id, selectedStatus); }} className="px-3 py-2 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Save changes</button></div>
            </section>
        </div>
    );
}
