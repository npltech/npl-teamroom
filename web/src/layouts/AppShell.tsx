import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { ROLE_LABEL, type Role } from '../data/roles';
import { useEffect, useState } from 'react';

const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];

export default function AppShell() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('EMPLOYEE');

  useEffect(() => {
    const stored = localStorage.getItem('roster.role') as Role | null;
    if (stored) setRole(stored);
    else navigate('/login');
  }, [navigate]);

  function switchRole(next: Role) {
    localStorage.setItem('roster.role', next);
    setRole(next);
  }

  function signOut() {
    localStorage.removeItem('roster.role');
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>
      <Sidebar role={role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex items-center justify-between border-b bg-white px-6 py-3.5"
          style={{ borderColor: 'var(--line-soft)' }}
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Tuesday, 12 August 2026
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Preview role
              </span>
              <select
                value={role}
                onChange={(e) => switchRole(e.target.value as Role)}
                className="border px-2.5 py-1.5 font-mono text-xs"
                style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={signOut}
              className="border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--paper)]"
              style={{ borderColor: 'var(--line)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet context={{ role }} />
        </main>
      </div>
    </div>
  );
}
