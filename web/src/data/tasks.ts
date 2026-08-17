import { useCallback, useEffect, useState } from 'react';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string; // employee_id
  assigned_by: string; // employee_id
  client_id: string;
  project_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  estimated_hours: number;
  worked_hours: number;
  due_date: string; // YYYY-MM-DD
  created_at: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'roster.tasks';

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// Mirrors the "My tasks" rows already shown on the employee dashboard, now
// backed by real data instead of static text.
const SEED_TASKS: Task[] = [
  { id: 'tk1', title: 'Homepage hero refresh', description: 'Update hero sections and CTA flow for the client homepage.', assigned_to: 'e4', assigned_by: 'e6', client_id: 'c1', project_id: 'p1', status: 'IN_PROGRESS', priority: 'HIGH', estimated_hours: 6, worked_hours: 2.5, due_date: daysFromNow(2), created_at: daysFromNow(-5) },
  { id: 'tk2', title: 'Create lead capture form', description: 'Complete the form validation and CRM integration.', assigned_to: 'e7', assigned_by: 'e6', client_id: 'c1', project_id: 'p1', status: 'TODO', priority: 'MEDIUM', estimated_hours: 4, worked_hours: 0, due_date: daysFromNow(4), created_at: daysFromNow(-3) },
  { id: 'tk3', title: 'Portal analytics dashboard', description: 'Finish KPI widgets and team report layout.', assigned_to: 'e3', assigned_by: 'e12', client_id: 'c1', project_id: 'p2', status: 'IN_PROGRESS', priority: 'HIGH', estimated_hours: 5, worked_hours: 2, due_date: daysFromNow(1), created_at: daysFromNow(-7) },
  { id: 'tk4', title: 'Review marketing report exports', description: 'Validate exports and reconcile campaign numbers.', assigned_to: 'e1', assigned_by: 'e6', client_id: 'c1', project_id: 'p3', status: 'TODO', priority: 'MEDIUM', estimated_hours: 3, worked_hours: 0, due_date: daysFromNow(6), created_at: daysFromNow(-2) },
  { id: 'tk5', title: 'Fix login redirect bug', description: 'Redirect loop on expired session tokens.', assigned_to: 'e4', assigned_by: 'e6', client_id: 'c1', project_id: 'p2', status: 'COMPLETED', priority: 'HIGH', estimated_hours: 4, worked_hours: 4, due_date: daysFromNow(-1), created_at: daysFromNow(-4) },
  { id: 'tk6', title: 'Prepare onboarding checklist template', description: 'Standard checklist for new joiners across departments.', assigned_to: 'e12', assigned_by: 'e12', client_id: 'c1', project_id: 'p2', status: 'TODO', priority: 'LOW', estimated_hours: 3, worked_hours: 0, due_date: daysFromNow(4), created_at: daysFromNow(-1) },
];

function load(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TASKS));
      return SEED_TASKS;
    }
    return JSON.parse(raw) as Task[];
  } catch {
    return SEED_TASKS;
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback(
    (payload: {
      title: string;
      description: string;
      assigned_to: string;
      assigned_by: string;
      client_id: string;
      project_id: string;
      priority: TaskPriority;
      estimated_hours: number;
      due_date: string;
    }) => {
      setTasks((prev) => [
        {
          id: crypto.randomUUID(),
          status: 'TODO',
          worked_hours: 0,
          created_at: new Date().toISOString().slice(0, 10),
          ...payload,
        },
        ...prev,
      ]);
    },
    [],
  );

  const setStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const logHours = useCallback((id: string, hours: number) => {
    if (hours <= 0) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, worked_hours: Math.round((t.worked_hours + hours) * 10) / 10 } : t)),
    );
  }, []);

  return { tasks, addTask, setStatus, logHours };
}
