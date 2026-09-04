import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useUsers, type UserStatus } from '../data/users';
import { usePermissions, MODULES } from '../data/permissions';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { Role } from '../data/roles';

type Ctx = { role: Role };

const ROLE_OPTIONS: Role[] = ['SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
const STATUS_OPTIONS: UserStatus[] = ['ACTIVE', 'INVITED', 'SUSPENDED'];

const inputStyle = { borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' } as const;

export default function UsersPage() {
    const { role: userRole } = useOutletContext<Ctx>();
    const canManage = userRole === 'SUPER_ADMIN';

    const { users, inviteUser, setRole, setStatus, removeUser } = useUsers();
    const { matrix, toggle } = usePermissions();

    const [tab, setTab] = useState<'users' | 'permissions'>('users');
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'EMPLOYEE' as Role, employee_id: '' });
    const [removeId, setRemoveId] = useState<string | null>(null);

    function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
        inviteUser({
            name: inviteForm.name.trim(),
            email: inviteForm.email.trim(),
            role: inviteForm.role,
            employee_id: inviteForm.employee_id || null,
        });
        setInviteForm({ name: '', email: '', role: 'EMPLOYEE', employee_id: '' });
        setShowInviteForm(false);
    }

    const getStatusColor = (status: UserStatus) => {
        switch (status) {
            case 'ACTIVE':
                return 'var(--status-present)';
            case 'INVITED':
                return 'var(--status-pending)';
            case 'SUSPENDED':
                return 'var(--status-absent)';
        }
    };

    const getStatusBg = (status: UserStatus) => {
        switch (status) {
            case 'ACTIVE':
                return 'var(--status-present-bg)';
            case 'INVITED':
                return 'var(--status-pending-bg)';
            case 'SUSPENDED':
                return 'var(--status-absent-bg)';
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--primary)' }}>
                        Admin
                    </p>
                    <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
                        Users & Roles
                    </h1>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Manage system users, roles, and permissions.
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowInviteForm(true)}
                        className="px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                        style={{ background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                    >
                        + Invite user
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 border-b" style={{ borderColor: 'var(--line-soft)' }}>
                {(['users', 'permissions'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className="border-b-2 px-4 py-3 font-mono text-sm uppercase tracking-wide transition-colors"
                        style={{
                            borderColor: tab === t ? 'var(--primary)' : 'transparent',
                            color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
                        }}
                    >
                        {t === 'users' ? 'Users' : 'Permissions'}
                    </button>
                ))}
            </div>

            {/* Users Tab */}
            {tab === 'users' && (
                <div className="mt-6 border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                    {users.length === 0 ? (
                        <p className="px-6 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                            No users yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderColor: 'var(--line-soft)', background: 'var(--paper)' }} className="border-b">
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                            Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                            Last login
                                        </th>
                                        {canManage && <th className="px-6 py-3"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} style={{ borderColor: 'var(--line-soft)' }} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--ink)' }}>
                                                <div>
                                                    <p className="font-medium">{u.name}</p>
                                                    {u.employee_id && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>EMP-{u.employee_id}</p>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {canManage ? (
                                                    <select
                                                        value={u.role}
                                                        onChange={(e) => setRole(u.id, e.target.value as Role)}
                                                        className="border px-2 py-1 text-xs font-mono uppercase"
                                                        style={inputStyle}
                                                    >
                                                        {ROLE_OPTIONS.map((r) => (
                                                            <option key={r} value={r}>
                                                                {r}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="font-mono text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>
                                                        {u.role}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {canManage ? (
                                                    <select
                                                        value={u.status}
                                                        onChange={(e) => setStatus(u.id, e.target.value as UserStatus)}
                                                        className="border px-2 py-1 text-xs font-mono uppercase"
                                                        style={{
                                                            ...inputStyle,
                                                            color: getStatusColor(u.status),
                                                            background: getStatusBg(u.status),
                                                        }}
                                                    >
                                                        {STATUS_OPTIONS.map((s) => (
                                                            <option key={s} value={s}>
                                                                {s}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span
                                                        className="font-mono px-2 py-0.5 text-[11px] uppercase"
                                                        style={{ background: getStatusBg(u.status), color: getStatusColor(u.status), borderRadius: 'var(--radius-sm)' }}
                                                    >
                                                        {u.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {u.last_login ?? '—'}
                                            </td>
                                            {canManage && (
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => setRemoveId(u.id)}
                                                        className="font-mono text-[11px] uppercase tracking-wide hover:underline"
                                                        style={{ color: 'var(--status-absent)' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <ConfirmDialog open={removeId !== null} message="Are you sure you want to remove this record?" onCancel={() => setRemoveId(null)} onConfirm={() => { if (removeId) removeUser(removeId); setRemoveId(null); }} />

            {/* Permissions Tab */}
            {tab === 'permissions' && (
                <div className="mt-6 border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderColor: 'var(--line-soft)', background: 'var(--paper)' }} className="border-b">
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                        Module
                                    </th>
                                    {ROLE_OPTIONS.map((r) => (
                                        <th key={r} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                            {r}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map((mod) => (
                                    <tr key={mod} style={{ borderColor: 'var(--line-soft)' }} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--ink)' }}>
                                            {mod}
                                        </td>
                                        {ROLE_OPTIONS.map((r) => (
                                            <td key={`${mod}-${r}`} className="px-6 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={matrix[r][mod]}
                                                    onChange={() => canManage && toggle(r, mod)}
                                                    disabled={!canManage}
                                                    className="w-5 h-5 cursor-pointer"
                                                    style={{
                                                        accentColor: 'var(--primary)',
                                                        cursor: canManage ? 'pointer' : 'not-allowed',
                                                        opacity: canManage ? 1 : 0.5,
                                                    }}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Invite User Modal */}
            {showInviteForm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
                    <div
                        className="w-full max-w-md border bg-white p-6"
                        style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}
                    >
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Invite user
                        </h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Add a new system user
                        </p>

                        <form onSubmit={handleInvite} className="mt-6 space-y-4">
                            <label className="block">
                                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                    Name
                                </span>
                                <input
                                    type="text"
                                    required
                                    value={inviteForm.name}
                                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                                    style={inputStyle}
                                />
                            </label>

                            <label className="block">
                                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                    Email
                                </span>
                                <input
                                    type="email"
                                    required
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    placeholder="e.g. john@company.com"
                                    className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                                    style={inputStyle}
                                />
                            </label>

                            <label className="block">
                                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                    Role
                                </span>
                                <select
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as Role })}
                                    className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                                    style={inputStyle}
                                >
                                    {ROLE_OPTIONS.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                    Employee ID (optional)
                                </span>
                                <input
                                    type="text"
                                    value={inviteForm.employee_id}
                                    onChange={(e) => setInviteForm({ ...inviteForm, employee_id: e.target.value })}
                                    placeholder="e.g. e123"
                                    className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                                    style={inputStyle}
                                />
                            </label>

                            <div className="mt-6 flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--line-soft)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteForm(false)}
                                    className="flex-1 py-2.5 text-sm font-medium border transition-colors hover:bg-gray-50"
                                    style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)', color: 'var(--ink)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
                                    style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                        borderRadius: 'var(--radius-sm)',
                                    }}
                                >
                                    Send invite
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
