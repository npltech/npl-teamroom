import { useCallback, useEffect, useState } from 'react';
import type { Candidate } from './recruitment';

export type OnboardingStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type OnboardingCategory = 'Personal Information' | 'Documents' | 'IT Setup' | 'Organization Setup' | 'Orientation';

export interface OnboardingTask {
    id: string;
    label: string;
    category: OnboardingCategory;
    completed: boolean;
}

export interface OnboardingRecord {
    id: string;
    candidate_id: string;
    joining_date: string;
    tasks: OnboardingTask[];
    employee_id: string | null;
    started: boolean;
}

const STORAGE_KEY = 'roster.onboarding';
const CATEGORIES: OnboardingCategory[] = ['Personal Information', 'Documents', 'IT Setup', 'Organization Setup', 'Orientation'];
const TASK_LABELS: Record<OnboardingCategory, string[]> = {
    'Personal Information': ['Collect personal details', 'Confirm emergency contact'],
    Documents: ['Verify identity documents', 'Collect signed offer letter', 'Collect bank details'],
    'IT Setup': ['Create email account', 'Provision laptop and access', 'Add security group access'],
    'Organization Setup': ['Assign manager and department', 'Add to HRIS', 'Share employee handbook'],
    Orientation: ['Schedule welcome session', 'Complete company orientation'],
};

function tasksFor(id: string, completed: string[] = []): OnboardingTask[] {
    return CATEGORIES.flatMap((category) => TASK_LABELS[category].map((label, index) => ({ id: `${id}-${category}-${index}`, label, category, completed: completed.includes(label) })));
}

const SEED_RECORDS: OnboardingRecord[] = [
    { id: 'onboard-1', candidate_id: 'candidate-4', joining_date: '2026-08-31', employee_id: null, started: true, tasks: tasksFor('onboard-1', ['Collect personal details', 'Confirm emergency contact', 'Verify identity documents', 'Collect signed offer letter', 'Create email account']) },
    { id: 'onboard-2', candidate_id: 'candidate-2', joining_date: '2026-09-07', employee_id: null, started: false, tasks: tasksFor('onboard-2') },
    { id: 'onboard-3', candidate_id: 'candidate-1', joining_date: '2026-08-28', employee_id: null, started: true, tasks: tasksFor('onboard-3', ['Collect personal details', 'Verify identity documents', 'Collect signed offer letter', 'Create email account', 'Assign manager and department', 'Schedule welcome session', 'Complete company orientation']) },
];

function load(): OnboardingRecord[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_RECORDS));
            return SEED_RECORDS;
        }
        return JSON.parse(raw) as OnboardingRecord[];
    } catch {
        return SEED_RECORDS;
    }
}

export function useOnboarding(candidates: Candidate[]) {
    const [records, setRecords] = useState<OnboardingRecord[]>(() => load());
    useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(records)), [records]);

    const startOnboarding = useCallback((candidate: Candidate, joiningDate: string) => {
        setRecords((previous) => previous.map((record) => record.candidate_id === candidate.id ? { ...record, started: true } : record).some((record) => record.candidate_id === candidate.id) ? previous.map((record) => record.candidate_id === candidate.id ? { ...record, started: true } : record) : [...previous, { id: crypto.randomUUID(), candidate_id: candidate.id, joining_date: joiningDate, employee_id: null, started: true, tasks: tasksFor(candidate.id) }]);
    }, []);
    const toggleTask = useCallback((recordId: string, taskId: string) => {
        setRecords((previous) => previous.map((record) => record.id === recordId ? { ...record, tasks: record.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task) } : record));
    }, []);
    const activateEmployee = useCallback((recordId: string, employeeId: string) => {
        setRecords((previous) => previous.map((record) => record.id === recordId ? { ...record, employee_id: employeeId } : record));
    }, []);

    const enriched = records.filter((record) => candidates.some((candidate) => candidate.id === record.candidate_id)).map((record) => {
        const completed = record.tasks.filter((task) => task.completed).length;
        const status: OnboardingStatus = !record.started ? 'PENDING' : completed === record.tasks.length ? 'COMPLETED' : 'IN_PROGRESS';
        return { ...record, status, progress: Math.round((completed / record.tasks.length) * 100), candidate: candidates.find((candidate) => candidate.id === record.candidate_id)! };
    });
    return { records: enriched, startOnboarding, toggleTask, activateEmployee };
}

export { CATEGORIES };
