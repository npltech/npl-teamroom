import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ClientType = 'INTERNAL' | 'EXTERNAL';
export type ClientStatus = 'ACTIVE' | 'INACTIVE';
export type ClientSource = 'Upwork' | 'Fiverr' | 'LinkedIn' | 'Referral' | 'Website' | 'Direct' | 'Other' | '';

export interface Client {
    id: string;
    name: string;
    contact_person: string;
    email: string;
    phone: string;
    notes: string;
    source: ClientSource;
    type: ClientType;
    status: ClientStatus;
}

type ClientRow = Omit<Client, 'type' | 'status'> & { type: 'Internal' | 'External'; status: 'Active' | 'Inactive' };

function fromRow(row: ClientRow): Client {
    return {
        ...row,
        contact_person: row.contact_person ?? '',
        email: row.email ?? '',
        phone: row.phone ?? '',
        notes: row.notes ?? '',
        source: row.source ?? '',
        type: row.type === 'Internal' ? 'INTERNAL' : 'EXTERNAL',
        status: row.status === 'Active' ? 'ACTIVE' : 'INACTIVE',
    };
}

function toRow(payload: Omit<Client, 'id'> | Partial<Omit<Client, 'id'>>) {
    return {
        ...payload,
        ...(payload.source !== undefined ? { source: payload.source || null } : {}),
        ...(payload.type ? { type: payload.type === 'INTERNAL' ? 'Internal' : 'External' } : {}),
        ...(payload.status ? { status: payload.status === 'ACTIVE' ? 'Active' : 'Inactive' } : {}),
    };
}

const SELECT = 'id, name, contact_person, email, phone, notes, source, type, status';

export function useClients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase.from('clients').select(SELECT).order('name');
        if (fetchError) {
            setError(fetchError.message);
        } else {
            setError(null);
            setClients((data ?? []).map((row) => fromRow(row as ClientRow)));
        }
        setLoading(false);
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    const addClient = useCallback(async (payload: Omit<Client, 'id'>) => {
        const { data, error: insertError } = await supabase.from('clients').insert(toRow(payload)).select(SELECT).single();
        if (insertError) {
            setError(insertError.message);
            return null;
        }
        const client = fromRow(data as ClientRow);
        setClients((prev) => [client, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
        return client.id;
    }, []);

    const updateClient = useCallback(async (id: string, patch: Partial<Omit<Client, 'id'>>) => {
        const { data, error: updateError } = await supabase.from('clients').update(toRow(patch)).eq('id', id).select(SELECT).single();
        if (updateError) {
            setError(updateError.message);
            return updateError.message;
        }
        const client = fromRow(data as ClientRow);
        setClients((prev) => prev.map((item) => item.id === id ? client : item).sort((a, b) => a.name.localeCompare(b.name)));
        return null;
    }, []);

    const toggleStatus = useCallback(async (id: string) => {
        const current = clients.find((client) => client.id === id);
        if (!current) return;
        await updateClient(id, { status: current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
    }, [clients, updateClient]);

    return { clients, loading, error, addClient, updateClient, toggleStatus, refresh };
}
