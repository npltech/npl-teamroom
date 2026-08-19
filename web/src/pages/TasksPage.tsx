import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useClients } from '../data/clients';
import { useCurrentEmployee } from '../data/currentUser';
import { useEmployees } from '../data/employees';
import { useProjects } from '../data/projects';
import { useTasks, type Task, type TaskPriority, type TaskStatus } from '../data/tasks';
import { Drawer } from '../components/Drawer';
import { StatCard } from '../components/Ledger';
import type { Role } from '../data/roles';

type Ctx = { role: Role };

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const STATUS_LABEL: Record<TaskStatus, string> = { TODO: 'To do', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' };
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: 'var(--status-neutral)',
  MEDIUM: 'var(--status-pending)',
  HIGH: 'var(--status-absent)',
};

const inputStyle = { borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function TaskRow({
  task,
  assigneeName,
  clientName,
  projectName,
  onStatusChange,
  onLogHours,
}: {
  task: Task;
  assigneeName?: string;
  clientName?: string;
  projectName?: string;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onLogHours: (id: string, hours: number) => void;
}) {
  const navigate = useNavigate();
  const [hoursInput, setHoursInput] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const overdue = task.due_date < today && task.status !== 'COMPLETED';

  return (
    <div onClick={() => navigate(`/tasks/${task.id}`)} className="flex cursor-pointer flex-wrap items-center gap-3 border-b px-5 py-3.5 last:border-b-0" style={{ borderColor: 'var(--line-soft)' }}>
      <span className="h-8 w-[3px] shrink-0" style={{ background: PRIORITY_COLOR[task.priority] }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {task.title}
          {assigneeName && (
            <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
              — {assigneeName}
            </span>
          )}
        </p>
        <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
          {clientName && projectName ? `${clientName} · ${projectName}` : task.description}
        </p>
        <p className="mt-1 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {task.description}
        </p>
      </div>

      <span
        className="font-mono px-2 py-0.5 text-[11px] uppercase"
        style={{ background: 'var(--accent-structure-bg)', color: 'var(--accent-structure)', borderRadius: 'var(--radius-sm)' }}
      >
        {task.priority}
      </span>

      <span className="font-mono text-xs" style={{ color: overdue ? 'var(--status-absent)' : 'var(--text-secondary)' }}>
        Due {task.due_date}
      </span>

      <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
        {task.worked_hours}/{task.estimated_hours}h
      </span>

      <select
        onClick={(e) => e.stopPropagation()}
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
        className="border px-2 py-1.5 font-mono text-xs outline-none"
        style={inputStyle}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <input
          onClick={(e) => e.stopPropagation()}
          type="number"
          min="0"
          step="0.5"
          value={hoursInput}
          onChange={(e) => setHoursInput(e.target.value)}
          placeholder="hrs"
          className="w-16 border px-2 py-1.5 text-xs outline-none"
          style={inputStyle}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            const h = parseFloat(hoursInput);
            if (!isNaN(h) && h > 0) {
              onLogHours(task.id, h);
              setHoursInput('');
            }
          }}
          className="px-2 py-1.5 font-mono text-[11px] uppercase"
          style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
        >
          Log
        </button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { role } = useOutletContext<Ctx>();
  const employee = useCurrentEmployee(role);
  const { employees } = useEmployees();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { tasks, addTask, setStatus, logHours } = useTasks();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [dueDate, setDueDate] = useState('');

  const canAssign = role === 'MANAGER' || role === 'HR' || role === 'SUPER_ADMIN';

  const assignableEmployees = useMemo(() => {
    if (role === 'HR' || role === 'SUPER_ADMIN') return employees;
    if (role === 'MANAGER' && employee) return employees.filter((e) => e.manager_id === employee.id);
    return [];
  }, [role, employee, employees]);

  const availableProjects = useMemo(
    () => projects.filter((project) => !selectedClientId || project.client_id === selectedClientId),
    [projects, selectedClientId],
  );

  const visibleTasks = useMemo(() => {
    if (role === 'HR' || role === 'SUPER_ADMIN') return tasks;
    if (role === 'MANAGER' && employee) {
      const teamIds = new Set(employees.filter((e) => e.manager_id === employee.id).map((e) => e.id));
      return tasks.filter((t) => teamIds.has(t.assigned_to) || t.assigned_to === employee.id);
    }
    if (employee) return tasks.filter((t) => t.assigned_to === employee.id);
    return [];
  }, [role, employee, employees, tasks]);

  const nameFor = (id: string) => employees.find((e) => e.id === id)?.name ?? 'Unknown';
  const clientNameFor = (id: string) => clients.find((client) => client.id === id)?.name ?? 'Unknown';
  const projectNameFor = (id: string) => projects.find((project) => project.id === id)?.name ?? 'Unknown';
  const today = new Date().toISOString().slice(0, 10);
  const openCount = visibleTasks.filter((t) => t.status !== 'COMPLETED').length;
  const overdueCount = visibleTasks.filter((t) => t.status !== 'COMPLETED' && t.due_date < today).length;
  const completedCount = visibleTasks.filter((t) => t.status === 'COMPLETED').length;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employee || !title.trim() || !assignedTo || !selectedClientId || !selectedProjectId || !dueDate) return;
    addTask({
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedTo,
      assigned_by: employee.id,
      client_id: selectedClientId,
      project_id: selectedProjectId,
      priority,
      estimated_hours: parseFloat(estimatedHours) || 0,
      due_date: dueDate,
    });
    setTitle('');
    setDescription('');
    setSelectedClientId('');
    setSelectedProjectId('');
    setAssignedTo('');
    setPriority('MEDIUM');
    setEstimatedHours('');
    setDueDate('');
    setDrawerOpen(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--status-pending)' }}>
            Tasks
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            {role === 'HR' || role === 'SUPER_ADMIN' ? 'All tasks' : role === 'MANAGER' ? 'Team tasks' : 'My tasks'}
          </h1>
        </div>
        {canAssign && employee && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
          >
            + New task
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard label="Open" value={openCount} status="pending" />
        <StatCard label="Overdue" value={overdueCount} status="absent" />
        <StatCard label="Completed" value={completedCount} status="present" />
      </div>

      <div className="mt-6 border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
        {visibleTasks.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No tasks to show.
          </p>
        ) : (
          visibleTasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              assigneeName={role !== 'EMPLOYEE' ? nameFor(t.assigned_to) : undefined}
              clientName={clientNameFor(t.client_id)}
              projectName={projectNameFor(t.project_id)}
              onStatusChange={setStatus}
              onLogHours={logHours}
            />
          ))
        )}
      </div>

      <Drawer open={drawerOpen} title="New task" onClose={() => setDrawerOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title">
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border px-3 py-2 text-sm outline-none" style={inputStyle} />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Client">
              <select
                required
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setSelectedProjectId('');
                }}
                className="w-full border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="" disabled>
                  Select client…
                </option>
                {clients.filter((client) => client.status === 'ACTIVE').map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project">
              <select
                required
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full border px-3 py-2 text-sm outline-none"
                style={inputStyle}
                disabled={!selectedClientId}
              >
                <option value="" disabled>
                  Select project…
                </option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Assign to">
            <select required value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border px-3 py-2 text-sm outline-none" style={inputStyle}>
              <option value="" disabled>
                Select…
              </option>
              {assignableEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="w-full border px-3 py-2 text-sm outline-none" style={inputStyle}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estimated hours">
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                className="w-full border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </Field>
          </div>
          <Field label="Due date">
            <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border px-3 py-2 text-sm outline-none" style={inputStyle} />
          </Field>
          <button
            type="submit"
            className="w-full py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
          >
            Create task
          </button>
        </form>
      </Drawer>
    </div>
  );
}
