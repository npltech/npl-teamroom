import { useCallback, useEffect, useState } from 'react';

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

const STORAGE_KEY = 'roster.clients';

const DEFAULT_CLIENT: Client = {
    id: 'c1',
    name: 'Northern Planet',
    contact_person: 'Amelia Stone',
    email: 'amelia@northplanet.co',
    phone: '+91 98765 43210',
    notes: 'Primary partner for digital growth and portal work.',
    source: '',
    type: 'INTERNAL',
    status: 'ACTIVE',
};

function load(): Client[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            const existing = JSON.parse(localStorage.getItem('roster.clients') ?? 'null');
            const seed = existing && Array.isArray(existing) && existing.length > 0 ? existing : [DEFAULT_CLIENT];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
            return seed;
        }

        const parsed = JSON.parse(raw) as Client[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_CLIENT]));
            return [DEFAULT_CLIENT];
        }

        const exists = parsed.some((client) => client.name.toLowerCase() === DEFAULT_CLIENT.name.toLowerCase());
        if (!exists) {
            const next = [DEFAULT_CLIENT, ...parsed];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        }

        return parsed;
    } catch {
        return [DEFAULT_CLIENT];
    }
}

export function useClients() {
    const [clients, setClients] = useState<Client[]>(() => load());

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    }, [clients]);

    const addClient = useCallback((payload: Omit<Client, 'id'>) => {
        setClients((prev) => {
            const exists = prev.some((client) => client.name.trim().toLowerCase() === payload.name.trim().toLowerCase());
            if (exists) return prev;
            return [{ ...payload, id: crypto.randomUUID() }, ...prev];
        });
    }, []);

    const updateClient = useCallback((id: string, patch: Partial<Omit<Client, 'id'>>) => {
        setClients((prev) => prev.map((client) => (client.id === id ? { ...client, ...patch } : client)));
    }, []);

    const toggleStatus = useCallback((id: string) => {
        setClients((prev) =>
            prev.map((client) =>
                client.id === id
                    ? { ...client, status: client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
                    : client,
            ),
        );
    }, []);

    return { clients, addClient, updateClient, toggleStatus };
}
