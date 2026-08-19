import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { ROLE_LABEL, type Role } from '../data/roles';
import { useCurrentEmployee } from '../data/currentUser';
import { useDepartments } from '../data/departments';
import { useDesignations } from '../data/designations';
import { useEmployees, type Gender } from '../data/employees';
import { useUsers } from '../data/users';
import { Drawer } from '../components/Drawer';
import { useEffect, useMemo, useState } from 'react';

const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];
const PROFILE_OVERRIDES_KEY = 'roster.profile-overrides';
const GENDERS: Gender[] = ['Male', 'Female', 'Other', 'Prefer not to say'];

type ProfileOverride = { name?: string; date_of_birth?: string; gender?: Gender };
type ProfileOverrides = Partial<Record<Role, ProfileOverride>>;

export default function AppShell() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const employee = useCurrentEmployee(role);
  const { employees, updateEmployee } = useEmployees();
  const { users } = useUsers();
  const { departments } = useDepartments();
  const { designations } = useDesignations();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileOverrides, setProfileOverrides] = useState<ProfileOverrides>(() => {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_OVERRIDES_KEY) ?? '{}') as ProfileOverrides;
    } catch {
      return {};
    }
  });
  const [profileName, setProfileName] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [profileGender, setProfileGender] = useState<Gender | ''>('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const account = useMemo(() => users.find((user) => user.role === role) ?? null, [users, role]);
  const override = profileOverrides[role] ?? {};
  const profileEmployee = employee ?? (account?.employee_id ? employees.find((item) => item.id === account.employee_id) ?? null : null);
  const profileNameDisplay = override.name ?? profileEmployee?.name ?? account?.name ?? ROLE_LABEL[role];
  const profileEmail = profileEmployee?.email ?? account?.email ?? '—';
  const profileUsername = profileEmployee?.employee_code ?? account?.email ?? '—';
  const profileInitials = profileNameDisplay.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';

  function openProfile() {
    setProfileName(profileNameDisplay);
    setProfileDob(override.date_of_birth ?? profileEmployee?.date_of_birth ?? '');
    setProfileGender(override.gender ?? profileEmployee?.gender ?? '');
    setProfileError('');
    setProfileSuccess(false);
    setProfileOpen(true);
  }

  function closeProfile() {
    setProfileOpen(false);
    setProfileError('');
  }

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    if (!profileName.trim()) {
      setProfileError('Name is required.');
      return;
    }
    if (profileDob && profileDob > today) {
      setProfileError('Date of birth cannot be in the future.');
      return;
    }

    const nextOverride = { name: profileName.trim(), date_of_birth: profileDob, ...(profileGender ? { gender: profileGender } : {}) };
    const nextOverrides = { ...profileOverrides, [role]: nextOverride };
    setProfileOverrides(nextOverrides);
    localStorage.setItem(PROFILE_OVERRIDES_KEY, JSON.stringify(nextOverrides));
    if (profileEmployee) {
      updateEmployee(profileEmployee.id, { name: nextOverride.name, date_of_birth: profileDob || undefined, gender: profileGender || undefined });
    }
    setProfileSuccess(true);
    setProfileError('');
    window.setTimeout(() => setProfileSuccess(false), 3000);
  }

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
            <button
              onClick={openProfile}
              aria-label="Open my profile"
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
              style={{ background: 'var(--accent-structure)', color: '#fff' }}
            >
              {profileInitials}
            </button>
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

      <Drawer open={profileOpen} title="My Profile" onClose={closeProfile}>
        <form onSubmit={saveProfile} className="flex min-h-full flex-col">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-5" style={{ borderColor: 'var(--line-soft)' }}>
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold" style={{ background: 'var(--accent-structure)', color: '#fff' }}>{profileInitials}</div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{profileNameDisplay}</p>
                <p className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{profileUsername}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Email</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{profileEmail}</p></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Role</p><span className="mt-1 inline-flex rounded-sm px-2 py-1 font-mono text-[10px] uppercase" style={{ background: 'var(--accent-structure-bg)', color: 'var(--accent-structure)' }}>{ROLE_LABEL[role]}</span></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Department</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{profileEmployee ? departments.find((item) => item.id === profileEmployee.department_id)?.name ?? '—' : '—'}</p></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Designation</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{profileEmployee ? designations.find((item) => item.id === profileEmployee.designation_id)?.name ?? '—' : '—'}</p></div>
            </div>

            <div className="border-t pt-5" style={{ borderColor: 'var(--line-soft)' }}>
              <p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Edit profile</p>
              <div className="mt-4 space-y-4">
                <label className="block"><span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Name</span><input required value={profileName} onChange={(e) => setProfileName(e.target.value)} className="mt-1.5 w-full border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /></label>
                <label className="block"><span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Date of Birth</span><input type="date" value={profileDob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setProfileDob(e.target.value)} className="mt-1.5 w-full border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }} /></label>
                <label className="block"><span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Gender</span><select value={profileGender} onChange={(e) => setProfileGender(e.target.value as Gender | '')} className="mt-1.5 w-full border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}><option value="">Select gender</option>{GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}</select></label>
              </div>
            </div>
            {profileError && <p className="text-sm" style={{ color: 'var(--status-absent)' }}>{profileError}</p>}
            {profileSuccess && <p className="text-sm" style={{ color: 'var(--status-present)' }}>Profile updated successfully</p>}
          </div>
          <div className="sticky bottom-0 mt-auto flex gap-2 border-t bg-white pt-5" style={{ borderColor: 'var(--line-soft)' }}><button type="button" onClick={closeProfile} className="flex-1 border px-3 py-2.5 text-sm font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>Cancel</button><button type="submit" className="flex-1 px-3 py-2.5 text-sm font-medium" style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}>Save changes</button></div>
        </form>
      </Drawer>
    </div>
  );
}
