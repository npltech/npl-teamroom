import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Designation {
    id: string;
    name: string;
    department_id: string;
}

export function useDesignations(departmentId?: string) {
    const [designations, setDesignations] = useState<Designation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('designations')
            .select('id, name, department_id')
            .order('name', { ascending: true });
        if (departmentId) query = query.eq('department_id', departmentId);
        const { data, error: fetchError } = await query;
        if (fetchError) {
            setError(fetchError.message);
        } else {
            setError(null);
            setDesignations((data ?? []) as Designation[]);
        }
        setLoading(false);
    }, [departmentId]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const addDesignation = useCallback(async (name: string, department_id: string) => {
        const { data, error: insertError } = await supabase
            .from('designations')
            .insert({ name, department_id })
            .select('id, name, department_id')
            .single();
        if (insertError) {
            setError(insertError.message);
            return null;
        }
        setDesignations((prev) => [...prev, data as Designation].sort((a, b) => a.name.localeCompare(b.name)));
        return (data as Designation).id;
    }, []);

    const removeDesignation = useCallback(async (id: string) => {
        const { error: deleteError } = await supabase.from('designations').delete().eq('id', id);
        if (deleteError) {
            setError(deleteError.message);
            return;
        }
        setDesignations((prev) => prev.filter((d) => d.id !== id));
    }, []);

    return { designations, loading, error, addDesignation, removeDesignation, refresh };
}
