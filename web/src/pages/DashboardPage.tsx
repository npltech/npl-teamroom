import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ROLE_LABEL, type Role } from '../data/roles';
import { StatCard, LedgerPanel, LedgerRow } from '../components/Ledger';
import { RosterStrip } from '../components/RosterStrip';
import { AttendanceDonut } from '../components/AttendanceDonut';
import { UpcomingHolidays } from '../components/UpcomingHolidays';
import { QuickLinks } from '../components/QuickLinks';
import { useEmployees } from '../data/employees';
import { useDepartments } from '../data/departments';
import { countHolidaysThisYear, useHolidays } from '../data/holidays';
import { supabase } from '../lib/supabase';
import { useCurrentEmployee } from '../data/currentUser';
import { useTasks } from '../data/tasks';

type Ctx = { role: Role };

function useProfileCounts() {
  const [counts, setCounts] = useState({ users: 0, activeUsers: 0 });

  useEffect(() => {
    async function loadCounts() {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [usersResult, activeUsersResult] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active_at', since),
      ]);
      if (usersResult.error) console.error('[Dashboard] Could not count users:', usersResult.error);
      if (activeUsersResult.error) console.error('[Dashboard] Could not count active users:', activeUsersResult.error);
      setCounts({ users: usersResult.count ?? 0, activeUsers: activeUsersResult.count ?? 0 });
    }
    void loadCounts();
  }, []);

  return counts;
}

function SuperAdminDashboard() {
  const { employees } = useEmployees();
  const { departments } = useDepartments();
  const { holidays } = useHolidays();
  const { users, activeUsers } = useProfileCounts();
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Users" value={users} status="structure" />
        <StatCard label="Employees" value={employees.length} status="present" />
        <StatCard label="Departments" value={departments.length} status="structure" />
        <StatCard label="Active users (24h)" value={activeUsers} status="present" />
        <StatCard label="Holidays this year" value={countHolidaysThisYear(holidays)} status="pending" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LedgerPanel title="Organization attendance — today">
          <div className="px-5 py-5">
            <AttendanceDonut
              centerLabel="Employees"
              segments={[
                { label: 'Present', value: 98, color: 'var(--status-present)' },
                { label: 'On leave', value: 14, color: 'var(--status-pending)' },
                { label: 'Absent', value: 6, color: 'var(--status-absent)' },
              ]}
            />
          </div>
        </LedgerPanel>
        <UpcomingHolidays canManage employees={employees} />
      </div>
    </>
  );
}

function HRDashboard() {
  const navigate = useNavigate();
  const { employees } = useEmployees();
  const { holidays } = useHolidays();
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Employees" value={employees.length} status="present" />
        <StatCard label="Open jobs" value={6} status="structure" />
        <StatCard label="Candidates" value={34} status="pending" />
        <StatCard label="New joiners (mtd)" value={5} status="present" />
        <StatCard label="Holidays this year" value={countHolidaysThisYear(holidays)} status="pending" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LedgerPanel title="Attendance — today">
          <div className="px-5 py-5">
            <AttendanceDonut
              centerLabel="Employees"
              segments={[
                { label: 'Present', value: 98, color: 'var(--status-present)' },
                { label: 'On leave', value: 14, color: 'var(--status-pending)' },
                { label: 'Absent', value: 6, color: 'var(--status-absent)' },
              ]}
            />
          </div>
        </LedgerPanel>
        <UpcomingHolidays canManage employees={employees} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <LedgerPanel title="Onboarding in progress">
          <LedgerRow primary="Priya Das" secondary="Design — offer letter sent" status="pending" />
          <LedgerRow primary="Rohan Verma" secondary="Engineering — IT setup" status="pending" />
          <LedgerRow primary="Sana Iqbal" secondary="Marketing — completed" status="present" />
        </LedgerPanel>
        <LedgerPanel title="Leave requests">
          <LedgerRow primary="Anita Rao" secondary="Sick leave · 2 days" meta="Pending" status="pending" onClick={() => navigate('/leave')} />
          <LedgerRow primary="Vikram Joshi" secondary="Annual leave · 5 days" meta="Approved" status="present" onClick={() => navigate('/leave')} />
          <LedgerRow primary="Farah Khan" secondary="Casual leave · 1 day" meta="Rejected" status="absent" onClick={() => navigate('/leave')} />
        </LedgerPanel>
      </div>
    </>
  );
}

function ManagerDashboard() {
  const { employees } = useEmployees();
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Team members" value={12} status="structure" />
        <StatCard label="Present" value={9} status="present" />
        <StatCard label="Absent" value={1} status="absent" />
        <StatCard label="On leave" value={2} status="pending" />
        <StatCard label="Open tasks" value={7} status="structure" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <LedgerPanel title="Team attendance — today">
          <div className="px-5 py-5">
            <AttendanceDonut
              centerLabel="Team"
              segments={[
                { label: 'Present', value: 9, color: 'var(--status-present)' },
                { label: 'On leave', value: 2, color: 'var(--status-pending)' },
                { label: 'Absent', value: 1, color: 'var(--status-absent)' },
              ]}
            />
          </div>
        </LedgerPanel>
        <UpcomingHolidays employees={employees} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <LedgerPanel title="Team — today">
          <LedgerRow primary="Devika Shetty" secondary="Office" meta="09:04" status="present" />
          <LedgerRow primary="Imran Qureshi" secondary="WFH" meta="09:21" status="present" />
          <LedgerRow primary="Neha Bhatt" secondary="Annual leave" status="pending" />
          <LedgerRow primary="Sameer Ali" secondary="No check-in" status="absent" />
        </LedgerPanel>
        <LedgerPanel title="Leave approvals">
          <LedgerRow primary="Neha Bhatt" secondary="Annual · 3 days" meta="Awaiting" status="pending" />
          <LedgerRow primary="Devika Shetty" secondary="Sick · 1 day" meta="Awaiting" status="pending" />
        </LedgerPanel>
      </div>

      <div className="mt-6">
        <QuickLinks
          links={[
            { label: 'Approve leave', path: '/leave' },
            { label: 'Team attendance', path: '/attendance' },
            { label: 'Org chart', path: '/org-chart' },
          ]}
        />
      </div>
    </>
  );
}

function EmployeeDashboard({ role }: { role: Role }) {
  const { employees } = useEmployees();
  const employee = useCurrentEmployee(role);
  const { tasks } = useTasks();
  const myTasks = employee ? tasks.filter((t) => t.assigned_to === employee.id).slice(0, 4) : [];
  const openCount = myTasks.filter((t) => t.status !== 'COMPLETED').length;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value="Checked in" status="present" />
        <StatCard label="Work mode" value="WFH" status="structure" />
        <StatCard label="Leave balance" value="14 days" status="present" />
        <StatCard label="Open tasks" value={openCount} status="pending" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
        <LedgerPanel title="My tasks">
          {myTasks.length === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              No tasks assigned right now.
            </p>
          ) : (
            myTasks.map((t) => (
              <LedgerRow
                key={t.id}
                primary={t.title}
                secondary={t.status === 'COMPLETED' ? 'Completed' : `Due ${t.due_date}`}
                status={t.status === 'COMPLETED' ? 'present' : t.status === 'IN_PROGRESS' ? 'pending' : 'neutral'}
              />
            ))
          )}
        </LedgerPanel>
        <div
          className="border p-5"
          style={{ background: 'var(--ink)', borderColor: 'var(--ink)', borderRadius: 'var(--radius-md)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-on-ink)' }}>
            Today's register
          </h3>
          <div className="mt-4">
            <RosterStrip
              events={[
                { time: '09:12', label: 'Checked in — WFH', status: 'present' },
                { time: '13:00', label: 'Break', status: 'neutral' },
                { time: '13:32', label: 'Resumed', status: 'present' },
              ]}
            />
          </div>
        </div>
        <UpcomingHolidays employees={employees} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <QuickLinks
          links={[
            { label: 'Apply leave', path: '/leave' },
            { label: 'Regularize attendance', path: '/attendance' },
            { label: 'Log task time', path: '/tasks' },
          ]}
        />
        <div />
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { role } = useOutletContext<Ctx>();

  const view = {
    SUPER_ADMIN: <SuperAdminDashboard />,
    HR: <HRDashboard />,
    MANAGER: <ManagerDashboard />,
    EMPLOYEE: <EmployeeDashboard role={role} />,
  }[role];

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--status-present)' }}>
        {ROLE_LABEL[role]} dashboard
      </p>
      <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Good morning.
      </h1>
      <div className="mt-6">{view}</div>
    </div>
  );
}
