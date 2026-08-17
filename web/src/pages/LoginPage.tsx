import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RosterStrip } from '../components/RosterStrip';
import type { Role } from '../data/roles';

const DEMO_ROLES: { role: Role; email: string }[] = [
  { role: 'SUPER_ADMIN', email: 'admin@roster.io' },
  { role: 'HR', email: 'hr@roster.io' },
  { role: 'MANAGER', email: 'manager@roster.io' },
  { role: 'EMPLOYEE', email: 'employee@roster.io' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const match = DEMO_ROLES.find((d) => d.email === email.trim().toLowerCase());
    localStorage.setItem('roster.role', match?.role ?? 'EMPLOYEE');
    navigate('/dashboard');
  }

  function quickFill(role: Role) {
    const demo = DEMO_ROLES.find((d) => d.role === role)!;
    setEmail(demo.email);
    setPassword('••••••••');
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2" style={{ background: 'var(--paper)' }}>
      {/* Left — form */}
      <div className="flex flex-col justify-between px-8 py-10 sm:px-16 lg:px-20">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center text-xs font-semibold"
            style={{ background: 'var(--ink)', color: 'var(--text-on-ink)' }}
          >
            R
          </span>
          <span className="font-mono text-xs tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
            ROSTER HR
          </span>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--status-present)' }}>
            Sign in
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold" style={{ color: 'var(--ink)' }}>
            Welcome back.
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enter your workspace credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Work email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="mt-1.5 w-full border bg-white px-3.5 py-2.5 text-sm outline-none transition-colors"
                style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Password
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full border bg-white px-3.5 py-2.5 text-sm outline-none transition-colors"
                style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
              />
            </label>

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
            >
              Sign in
            </button>
          </form>

          <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--line-soft)' }}>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Preview a role (POC demo)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ROLES.map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => quickFill(d.role)}
                  className="border px-3 py-1.5 font-mono text-xs transition-colors hover:bg-white"
                  style={{ borderColor: 'var(--line)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }}
                >
                  {d.role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
          © 2026 Roster HR — internal POC
        </p>
      </div>

      {/* Right — signature roster strip panel */}
      <div className="relative hidden overflow-hidden lg:block" style={{ background: 'var(--ink)' }}>
        <div className="absolute inset-0 flex flex-col justify-between p-14">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-on-ink-muted)' }}>
              Today — Tue 12 Aug
            </p>
            <h2 className="font-display mt-3 max-w-xs text-3xl font-medium leading-snug" style={{ color: 'var(--text-on-ink)' }}>
              Every check-in, request, and approval — one register.
            </h2>
          </div>

          <div>
            <RosterStrip
              events={[
                { time: '09:02', label: 'A. Mehta checked in — Office', status: 'present' },
                { time: '09:14', label: 'R. Kapoor checked in — WFH', status: 'present' },
                { time: '10:30', label: 'Leave request — S. Rao', status: 'pending' },
                { time: '13:05', label: 'N. Iyer — Sick leave, unmarked', status: 'absent' },
                { time: '17:45', label: 'Task closed — Onboarding checklist', status: 'neutral' },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
