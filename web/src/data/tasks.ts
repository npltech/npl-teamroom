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

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  date: string;
  hours: number;
  logged_by: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  commenter: string;
  timestamp: string;
  text: string;
}

const STORAGE_KEY = 'roster.tasks';
const TIME_LOG_STORAGE_KEY = 'roster.task-time-logs';
const COMMENT_STORAGE_KEY = 'roster.task-comments';

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

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => load());
  const [timeEntries, setTimeEntries] = useState<TaskTimeEntry[]>(() => loadList<TaskTimeEntry>(TIME_LOG_STORAGE_KEY));
  const [comments, setComments] = useState<TaskComment[]>(() => loadList<TaskComment>(COMMENT_STORAGE_KEY));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(TIME_LOG_STORAGE_KEY, JSON.stringify(timeEntries));
  }, [timeEntries]);

  useEffect(() => {
    localStorage.setItem(COMMENT_STORAGE_KEY, JSON.stringify(comments));
  }, [comments]);

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

  const logTime = useCallback((taskId: string, hours: number, loggedBy: string) => {
    if (hours <= 0) return;
    setTimeEntries((prev) => [...prev, {
      id: crypto.randomUUID(),
      task_id: taskId,
      date: new Date().toISOString().slice(0, 10),
      hours,
      logged_by: loggedBy,
    }]);
    setTasks((prev) => prev.map((task) => task.id === taskId ? { ...task, worked_hours: Math.round((task.worked_hours + hours) * 10) / 10 } : task));
  }, []);

  const addComment = useCallback((taskId: string, commenter: string, text: string) => {
    if (!text.trim()) return;
    setComments((prev) => [...prev, {
      id: crypto.randomUUID(),
      task_id: taskId,
      commenter,
      timestamp: new Date().toISOString(),
      text: text.trim(),
    }]);
  }, []);

  return { tasks, addTask, setStatus, logHours, timeEntries, comments, logTime, addComment };
}
