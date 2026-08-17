import { useCallback, useEffect, useState } from 'react';
import type { Role } from './roles';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface SystemUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    employee_id: string | null; // link to an Employee record, if any
    status: UserStatus;
    last_login: string | null; // YYYY-MM-DD
}

const STORAGE_KEY = 'roster.users';

// System login accounts — distinct from Employee records. Every employee
// might have a login, but some logins (e.g. a pure Super Admin) don't
// correspond to any employee row.
const SEED_USERS: SystemUser[] = [
    { id: 'u1', name: 'Northern Planet Admin', email: 'admin@roster.io', role: 'SUPER_ADMIN', employee_id: null, status: 'ACTIVE', last_login: '2026-08-17' },
    { id: 'u2', name: 'Anita Rao', email: 'anita.rao@roster.io', role: 'HR', employee_id: 'e12', status: 'ACTIVE', last_login: '2026-08-17' },
    { id: 'u3', name: 'Vikram Joshi', email: 'vikram.joshi@roster.io', role: 'MANAGER', employee_id: 'e6', status: 'ACTIVE', last_login: '2026-08-16' },
    { id: 'u4', name: 'Arjun Sinha', email: 'arjun.sinha@roster.io', role: 'EMPLOYEE', employee_id: 'e3', status: 'ACTIVE', last_login: '2026-08-17' },
    { id: 'u5', name: 'Devika Shetty', email: 'devika.shetty@roster.io', role: 'EMPLOYEE', employee_id: 'e4', status: 'ACTIVE', last_login: '2026-08-15' },
    { id: 'u6', name: 'Priya Das', email: 'priya.das@roster.io', role: 'EMPLOYEE', employee_id: 'e9', status: 'INVITED', last_login: null },
];

function load(): SystemUser[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_USERS));
            return SEED_USERS;
        }
        return JSON.parse(raw) as SystemUser[];
    } catch {
        return SEED_USERS;
    }
}

export function useUsers() {
    const [users, setUsers] = useState<SystemUser[]>(() => load());

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }, [users]);

    const inviteUser = useCallback(
        (payload: { name: string; email: string; role: Role; employee_id: string | null }) => {
            setUsers((prev) => [
                { id: crypto.randomUUID(), status: 'INVITED', last_login: null, ...payload },
                ...prev,
            ]);
        },
        [],
    );

    const setRole = useCallback((id: string, role: Role) => {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    }, []);

    const setStatus = useCallback((id: string, status: UserStatus) => {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    }, []);

    const removeUser = useCallback((id: string) => {
        setUsers((prev) => prev.filter((u) => u.id !== id));
    }, []);

    return { users, inviteUser, setRole, setStatus, removeUser };
}
