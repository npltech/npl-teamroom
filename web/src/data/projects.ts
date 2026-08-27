import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';

export interface Project {
    id: string;
    name: string;
    client_id: string;
    client_name?: string;
    description: string;
    start_date: string;
    deadline: string;
    status: ProjectStatus;
    team_member_ids: string[];
}

type ProjectRow = {
    id: string;
    client_id: string;
    name: string;
    description: string | null;
    start_date: string | null;
    deadline: string | null;
    status: 'Active' | 'On Hold' | 'Completed';
    clients?: { name: string } | Array<{ name: string }> | null;
    project_members?: Array<{ employee_id: string }>;
};

function fromRow(row: ProjectRow): Project {
    return {
        id: row.id,
        name: row.name,
        client_id: row.client_id,
        client_name: Array.isArray(row.clients) ? row.clients[0]?.name : row.clients?.name,
        description: row.description ?? '',
        start_date: row.start_date ?? '',
        deadline: row.deadline ?? '',
        status: row.status === 'Active' ? 'ACTIVE' : row.status === 'On Hold' ? 'ON_HOLD' : 'COMPLETED',
        team_member_ids: (row.project_members ?? []).map((member) => member.employee_id),
    };
}

function toRow(payload: Omit<Project, 'id'> | Partial<Omit<Project, 'id'>>) {
    const { client_name: _clientName, team_member_ids: _teamMemberIds, ...fields } = payload;
    return {
        ...fields,
        ...(payload.status ? { status: payload.status === 'ACTIVE' ? 'Active' : payload.status === 'ON_HOLD' ? 'On Hold' : 'Completed' } : {}),
        ...(payload.description !== undefined ? { description: payload.description || null } : {}),
        ...(payload.start_date !== undefined ? { start_date: payload.start_date || null } : {}),
        ...(payload.deadline !== undefined ? { deadline: payload.deadline || null } : {}),
    };
}

const SELECT = 'id, client_id, name, description, start_date, deadline, status, clients(name), project_members(employee_id)';

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase.from('projects').select(SELECT).order('name');
        if (fetchError) {
            setError(fetchError.message);
        } else {
            setError(null);
            setProjects((data ?? []).map((row) => fromRow(row as ProjectRow)));
        }
        setLoading(false);
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    const addProject = useCallback(async (payload: Omit<Project, 'id'>) => {
        const { team_member_ids, ...projectPayload } = payload;
        const { data, error: insertError } = await supabase.from('projects').insert(toRow(projectPayload)).select(SELECT).single();
        if (insertError) {
            setError(insertError.message);
            return null;
        }
        if (team_member_ids.length > 0) {
            const { error: memberError } = await supabase.from('project_members').insert(team_member_ids.map((employee_id) => ({ project_id: data.id, employee_id })));
            if (memberError) {
                setError(memberError.message);
                return null;
            }
        }
        await refresh();
        return data.id;
    }, [refresh]);

    const updateProject = useCallback(async (id: string, patch: Partial<Omit<Project, 'id'>>) => {
        const { team_member_ids, ...projectPatch } = patch;
        const { error: updateError } = await supabase.from('projects').update(toRow(projectPatch)).eq('id', id);
        if (updateError) {
            setError(updateError.message);
            return updateError.message;
        }
        if (team_member_ids !== undefined) {
            const { error: deleteError } = await supabase.from('project_members').delete().eq('project_id', id);
            if (deleteError) {
                setError(deleteError.message);
                return deleteError.message;
            }
            if (team_member_ids.length > 0) {
                const { error: memberError } = await supabase.from('project_members').insert(team_member_ids.map((employee_id) => ({ project_id: id, employee_id })));
                if (memberError) {
                    setError(memberError.message);
                    return memberError.message;
                }
            }
        }
        await refresh();
        return null;
    }, [refresh]);

    const toggleStatus = useCallback(async (id: string) => {
        const current = projects.find((project) => project.id === id);
        if (!current) return;
        const nextStatus: ProjectStatus = current.status === 'ACTIVE' ? 'ON_HOLD' : current.status === 'ON_HOLD' ? 'COMPLETED' : 'ACTIVE';
        await updateProject(id, { status: nextStatus });
    }, [projects, updateProject]);

    return { projects, loading, error, addProject, updateProject, toggleStatus, refresh };
}
