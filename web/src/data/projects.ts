import { useCallback, useEffect, useState } from 'react';

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';

export interface Project {
    id: string;
    name: string;
    client_id: string;
    description: string;
    start_date: string;
    deadline: string;
    status: ProjectStatus;
    team_member_ids: string[];
}

const STORAGE_KEY = 'roster.projects';

function getDefaultClientId(): string | null {
    try {
        const raw = localStorage.getItem('roster.clients');
        if (!raw) return null;
        const clients = JSON.parse(raw) as Array<{ id: string; name: string }>;
        return clients.find((client) => client.name === 'Northern Planet')?.id ?? clients[0]?.id ?? null;
    } catch {
        return null;
    }
}

const SEED_PROJECTS: Project[] = [
    {
        id: 'p1',
        name: 'Website Revamp',
        client_id: 'c1',
        description: 'Full redesign of the public marketing website and conversion funnel.',
        start_date: '2026-06-01',
        deadline: '2026-09-30',
        status: 'ACTIVE',
        team_member_ids: ['e4', 'e6', 'e7'],
    },
    {
        id: 'p2',
        name: 'HR Portal Refresh',
        client_id: 'c1',
        description: 'Modernized employee and attendance experience for the internal HR portal.',
        start_date: '2026-07-14',
        deadline: '2026-10-15',
        status: 'ACTIVE',
        team_member_ids: ['e3', 'e5', 'e12'],
    },
    {
        id: 'p3',
        name: 'Campaign Analytics Suite',
        client_id: 'c1',
        description: 'Dashboarding improvements and KPI reporting features.',
        start_date: '2026-05-10',
        deadline: '2026-08-25',
        status: 'ON_HOLD',
        team_member_ids: ['e1', 'e9', 'e10'],
    },
];

function load(): Project[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            const defaultClientId = getDefaultClientId();
            const seed = SEED_PROJECTS.map((project) => ({
                ...project,
                client_id: defaultClientId ?? project.client_id,
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
            return seed;
        }

        const parsed = JSON.parse(raw) as Project[];
        if (!Array.isArray(parsed)) {
            const defaultClientId = getDefaultClientId();
            const seed = SEED_PROJECTS.map((project) => ({
                ...project,
                client_id: defaultClientId ?? project.client_id,
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
            return seed;
        }

        return parsed;
    } catch {
        return SEED_PROJECTS;
    }
}

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>(() => load());

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }, [projects]);

    const addProject = useCallback((payload: Omit<Project, 'id'>) => {
        setProjects((prev) => [{ ...payload, id: crypto.randomUUID() }, ...prev]);
    }, []);

    const updateProject = useCallback((id: string, patch: Partial<Omit<Project, 'id'>>) => {
        setProjects((prev) => prev.map((project) => (project.id === id ? { ...project, ...patch } : project)));
    }, []);

    const toggleStatus = useCallback((id: string) => {
        setProjects((prev) =>
            prev.map((project) =>
                project.id === id
                    ? {
                        ...project,
                        status: project.status === 'ACTIVE' ? 'ON_HOLD' : project.status === 'ON_HOLD' ? 'COMPLETED' : 'ACTIVE',
                    }
                    : project,
            ),
        );
    }, []);

    return { projects, addProject, updateProject, toggleStatus };
}
