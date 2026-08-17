import { useCallback, useEffect, useState } from 'react';
import type { Role } from './roles';

export const MODULES = [
    'Dashboard',
    'Employees',
    'Attendance',
    'Leave',
    'Tasks',
    'Documents',
    'Holidays',
    'Reports',
    'Org Structure',
    'Users & Roles',
] as const;

export type ModuleKey = (typeof MODULES)[number];

export type PermissionMatrix = Record<Role, Record<ModuleKey, boolean>>;

const STORAGE_KEY = 'roster.permissions';

// Mirrors what each role's sidebar currently exposes, as a starting point.
const DEFAULT_MATRIX: PermissionMatrix = {
    SUPER_ADMIN: {
        Dashboard: true, Employees: false, Attendance: true, Leave: false, Tasks: true,
        Documents: false, Holidays: true, Reports: true, 'Org Structure': true, 'Users & Roles': true,
    },
    HR: {
        Dashboard: true, Employees: true, Attendance: true, Leave: true, Tasks: true,
        Documents: true, Holidays: true, Reports: true, 'Org Structure': true, 'Users & Roles': false,
    },
    MANAGER: {
        Dashboard: true, Employees: false, Attendance: true, Leave: true, Tasks: true,
        Documents: true, Holidays: true, Reports: false, 'Org Structure': true, 'Users & Roles': false,
    },
    EMPLOYEE: {
        Dashboard: true, Employees: false, Attendance: true, Leave: true, Tasks: true,
        Documents: true, Holidays: true, Reports: false, 'Org Structure': false, 'Users & Roles': false,
    },
};

function load(): PermissionMatrix {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MATRIX));
            return DEFAULT_MATRIX;
        }
        return JSON.parse(raw) as PermissionMatrix;
    } catch {
        return DEFAULT_MATRIX;
    }
}

export function usePermissions() {
    const [matrix, setMatrix] = useState<PermissionMatrix>(() => load());

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
    }, [matrix]);

    const toggle = useCallback((role: Role, mod: ModuleKey) => {
        setMatrix((prev) => ({
            ...prev,
            [role]: { ...prev[role], [mod]: !prev[role][mod] },
        }));
    }, []);

    const resetToDefault = useCallback(() => setMatrix(DEFAULT_MATRIX), []);

    return { matrix, toggle, resetToDefault };
}
