import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Drawer } from '../components/Drawer';
import { StatCard, StatusTag } from '../components/Ledger';
import { useRecruitment } from '../data/recruitment';
import { CATEGORIES, useOnboarding, type OnboardingCategory, type OnboardingRecord } from '../data/onboarding';
import { useEmployees } from '../data/employees';
import { useDepartments } from '../data/departments';
import { useDesignations } from '../data/designations';
import type { Role } from '../data/roles';

type Ctx = { role: Role };
const STATUS_LABEL = { PENDING: 'Pending', IN_PROGRESS: 'In progress', COMPLETED: 'Completed' } as const;
const STATUS_KIND = { PENDING: 'neutral', IN_PROGRESS: 'pending', COMPLETED: 'present' } as const;
const inputStyle = { borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block"><span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</span><div className="mt-1.5">{children}</div></label>;
}

function weekRange() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

export default function OnboardingPage() {
    const { role } = useOutletContext<Ctx>();
    const { candidates, updateCandidate } = useRecruitment();
    const { addEmployee } = useEmployees();
    const { departments } = useDepartments();
    const { designations } = useDesignations();
    const { records, startOnboarding, toggleTask, activateEmployee } = useOnboarding(candidates);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [joinerDrawer, setJoinerDrawer] = useState(false);
    const [joiningDate, setJoiningDate] = useState('');
    const [search, setSearch] = useState('');

    const selected = selectedId ? records.find((record) => record.id === selectedId) ?? null : null;
    const [weekStart, weekEnd] = weekRange();
    const stats = useMemo(() => ({ pending: records.filter((record) => record.status === 'PENDING').length, progress: records.filter((record) => record.status === 'IN_PROGRESS').length, completed: records.filter((record) => record.status === 'COMPLETED').length, joining: records.filter((record) => record.joining_date >= weekStart && record.joining_date <= weekEnd).length }), [records, weekStart, weekEnd]);
    const candidatesWithoutOnboarding = candidates.filter((candidate) => ['SELECTED', 'OFFER_SENT', 'HIRED'].includes(candidate.stage) && !records.some((record) => record.candidate_id === candidate.id));
    const filtered = records.filter((record) => `${record.candidate.name} ${record.candidate.email}`.toLowerCase().includes(search.toLowerCase()));

    function createJoiner(event: React.FormEvent) {
        event.preventDefault();
        const candidate = candidates.find((item) => item.id === selectedId);
        if (!candidate || !joiningDate) return;
        startOnboarding(candidate, joiningDate);
        setJoinerDrawer(false);
    }
    async function activate(record: OnboardingRecord) {
        const candidate = candidates.find((item) => item.id === record.candidate_id);
        if (!candidate) return;
        const department = departments.find((item) => item.name.toLowerCase().includes('engineering')) ?? departments[0];
        const designation = designations.find((item) => item.department_id === department?.id);
        if (!department || !designation) return;
        const employeeId = await addEmployee({ name: candidate.name, email: candidate.email, phone: candidate.phone, department_id: department?.id ?? '', designation_id: designation?.id ?? '', manager_id: null, joining_date: record.joining_date, employment_status: 'ACTIVE', work_mode: 'OFFICE' });
        if (!employeeId) return;
        activateEmployee(record.id, employeeId);
        updateCandidate(record.candidate_id, { stage: 'HIRED' });
    }

    if (role !== 'HR' && role !== 'SUPER_ADMIN') return <div className="border bg-white p-8 text-center" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>Onboarding is available to HR only.</div>;

    return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--status-present)' }}>People operations</p><h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>Onboarding</h1><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Guide new joiners from offer acceptance to their first day.</p></div><div className="flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search joiners" className="border bg-white px-3 py-2 text-sm" style={inputStyle} /><button onClick={() => setJoinerDrawer(true)} className="px-4 py-2.5 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>+ Start onboarding</button></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Pending" value={stats.pending} status="neutral" /><StatCard label="In progress" value={stats.progress} status="pending" /><StatCard label="Completed" value={stats.completed} status="present" /><StatCard label="Joining this week" value={stats.joining} status="structure" /></div><div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}><div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>New joiners</h2></div><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left" style={{ borderCollapse: 'collapse' }}><thead style={{ background: 'var(--paper)' }}><tr>{['Employee', 'Joining date', 'Department', 'Progress', 'Status'].map((heading) => <th key={heading} className="px-5 py-3 font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{heading}</th>)}</tr></thead><tbody>{filtered.map((record) => <tr id={`candidate-${record.candidate_id}`} key={record.id} onClick={() => setSelectedId(record.id)} className="cursor-pointer border-t transition-colors hover:bg-[var(--paper)]" style={{ borderColor: 'var(--line-soft)' }}><td className="px-5 py-3.5"><p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{record.candidate.name}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{record.candidate.email}</p></td><td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{record.joining_date}</td><td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>Engineering</td><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="h-1.5 w-28 overflow-hidden bg-[var(--paper)]"><div className="h-full" style={{ width: `${record.progress}%`, background: record.status === 'COMPLETED' ? 'var(--status-present)' : 'var(--accent-structure)' }} /></div><span className="font-mono text-xs" style={{ color: 'var(--ink)' }}>{record.progress}%</span></div></td><td className="px-5 py-3.5"><StatusTag status={STATUS_KIND[record.status]} label={STATUS_LABEL[record.status]} /></td></tr>)}</tbody></table></div></div>{candidatesWithoutOnboarding.length > 0 && <div className="border bg-white p-5" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}><h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Ready to onboard</h2><div className="mt-3 flex flex-wrap gap-2">{candidatesWithoutOnboarding.map((candidate) => <button key={candidate.id} onClick={() => { setSelectedId(candidate.id); setJoiningDate(''); setJoinerDrawer(true); }} className="border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>{candidate.name} · Start onboarding</button>)}</div></div>}

        <Drawer open={!!selected} title={selected ? `${selected.candidate.name} onboarding` : 'Onboarding profile'} onClose={() => setSelectedId(null)}>{selected && <div className="space-y-5"><div className="border-b pb-4" style={{ borderColor: 'var(--line-soft)' }}><p className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{selected.candidate.name}</p><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.candidate.email} · {selected.candidate.phone || 'No phone'}</p><p className="mt-2 font-mono text-xs uppercase" style={{ color: 'var(--text-secondary)' }}>Joining {selected.joining_date}</p></div>{!selected.started && <button onClick={() => startOnboarding(selected.candidate, selected.joining_date)} className="w-full py-2.5 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Start onboarding</button>}<div><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Checklist completion</p><span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-structure)' }}>{selected.progress}%</span></div><div className="mt-2 h-2 overflow-hidden bg-[var(--paper)]"><div className="h-full" style={{ width: `${selected.progress}%`, background: 'var(--accent-structure)' }} /></div></div>{CATEGORIES.map((category: OnboardingCategory) => <section key={category}><h3 className="border-b pb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink)', borderColor: 'var(--line-soft)' }}>{category}</h3><div className="mt-2 space-y-1">{selected.tasks.filter((task) => task.category === category).map((task) => <label key={task.id} className="flex items-center gap-3 px-2 py-2 text-sm hover:bg-[var(--paper)]" style={{ color: task.completed ? 'var(--text-secondary)' : 'var(--ink)' }}><input type="checkbox" checked={task.completed} onChange={() => toggleTask(selected.id, task.id)} /><span className={task.completed ? 'line-through' : ''}>{task.label}</span></label>)}</div></section>)}{selected.status === 'COMPLETED' && !selected.employee_id && <button onClick={() => activate(selected)} className="w-full py-2.5 text-sm font-medium" style={{ background: 'var(--status-present)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Create / activate employee profile</button>}{selected.employee_id && <p className="border p-3 text-sm" style={{ borderColor: '#BBF7D0', background: '#F0FDF4', color: '#166534', borderRadius: 'var(--radius-sm)' }}>Employee profile is active.</p>}</div>}</Drawer><Drawer open={joinerDrawer} title="Start onboarding" onClose={() => setJoinerDrawer(false)}><form onSubmit={createJoiner} className="space-y-4"><Field label="Candidate"><select required value={selectedId ?? ''} onChange={(event) => setSelectedId(event.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle}><option value="">Select candidate</option>{candidates.filter((candidate) => ['SELECTED', 'OFFER_SENT', 'HIRED'].includes(candidate.stage) && !records.some((record) => record.candidate_id === candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></Field><Field label="Joining date"><input type="date" required value={joiningDate} onChange={(event) => setJoiningDate(event.target.value)} className="w-full border px-3 py-2 text-sm" style={inputStyle} /></Field><button type="submit" className="w-full py-2.5 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Start onboarding</button></form></Drawer></div>;
}
