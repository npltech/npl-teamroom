import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useEmployees, type Employee, type WorkMode } from '../data/employees';
import { useDepartments } from '../data/departments';
import { useDesignations } from '../data/designations';
import { useEmployeeDocuments, type DocumentCategory } from '../data/employeeDocuments';
import { Drawer } from '../components/Drawer';
import { StatusTag } from '../components/Ledger';
import type { Role } from '../data/roles';

type Ctx = { role: Role };

const WORK_MODES: WorkMode[] = ['OFFICE', 'WFH', 'HYBRID'];

type FormState = {
  name: string;
  email: string;
  phone: string;
  department_id: string;
  designation_id: string;
  manager_id: string;
  joining_date: string;
  work_mode: WorkMode;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  department_id: '',
  designation_id: '',
  manager_id: '',
  joining_date: '',
  work_mode: 'OFFICE',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputStyle = {
  borderColor: 'var(--line)',
  borderRadius: 'var(--radius-sm)',
} as const;

export default function EmployeesPage() {
  const { role } = useOutletContext<Ctx>();
  const canManage = role === 'SUPER_ADMIN' || role === 'HR';

  const { employees, addEmployee, updateEmployee, toggleStatus } = useEmployees();
  const { departments } = useDepartments();
  const { designations } = useDesignations();

  const deptName = (id: string) => departments.find((d) => d.id === id)?.name ?? '—';
  const designationName = (id: string) => designations.find((d) => d.id === id)?.name ?? '—';
  const managerName = (id: string | null) => employees.find((e) => e.id === id)?.name ?? '—';

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { documents, addDocument, removeDocument } = useEmployeeDocuments(editingId);
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('ID Proof');
  const DOC_CATEGORIES: DocumentCategory[] = ['ID Proof', 'Education', 'Bank Details', 'Certificate', 'Other'];

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      const matchesDept = deptFilter === 'ALL' || e.department_id === deptFilter;
      const matchesStatus = statusFilter === 'ALL' || e.employment_status === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, search, deptFilter, statusFilter]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditingId(emp.id);
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department_id: emp.department_id,
      designation_id: emp.designation_id,
      manager_id: emp.manager_id ?? '',
      joining_date: emp.joining_date,
      work_mode: emp.work_mode,
    });
    setDrawerOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.department_id || !form.designation_id || !form.joining_date) {
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department_id: form.department_id,
      designation_id: form.designation_id,
      manager_id: form.manager_id || null,
      joining_date: form.joining_date,
      work_mode: form.work_mode,
    };
    if (editingId) {
      updateEmployee(editingId, payload);
    } else {
      addEmployee({ ...payload, employment_status: 'ACTIVE' });
    }
    setDrawerOpen(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--status-present)' }}>
            People
          </p>
          <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            Employees
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {filtered.length} of {employees.length} employees
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
          >
            + Add employee
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, code, or email…"
          className="w-64 border bg-white px-3.5 py-2 text-sm outline-none"
          style={inputStyle}
        />
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="border bg-white px-3 py-2 text-sm outline-none"
          style={inputStyle}
        >
          <option value="ALL">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden border" style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors"
              style={{
                background: statusFilter === s ? 'var(--ink)' : 'white',
                color: statusFilter === s ? 'var(--text-on-ink)' : 'var(--text-secondary)',
              }}
            >
              {s === 'ALL' ? 'All' : s === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="mt-5 overflow-hidden border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
        <div
          className="grid grid-cols-[2fr_1.3fr_1.3fr_1.3fr_0.9fr_0.9fr_auto] gap-3 border-b px-5 py-2.5"
          style={{ borderColor: 'var(--line-soft)' }}
        >
          {['Employee', 'Department', 'Designation', 'Manager', 'Work mode', 'Status', ''].map((h) => (
            <span key={h} className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            No employees match these filters.
          </p>
        ) : (
          filtered.map((emp) => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployeeId(emp.id)}
              className="grid cursor-pointer grid-cols-[2fr_1.3fr_1.3fr_1.3fr_0.9fr_0.9fr_auto] items-center gap-3 border-b px-5 py-3 last:border-b-0 hover:bg-[var(--paper)]"
              style={{ borderColor: 'var(--line-soft)', opacity: emp.employment_status === 'INACTIVE' ? 0.6 : 1 }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {emp.name}
                </p>
                <p className="font-mono truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                  {emp.employee_code}
                </p>
              </div>
              <span className="truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
                {deptName(emp.department_id)}
              </span>
              <span className="truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
                {designationName(emp.designation_id)}
              </span>
              <span className="truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
                {managerName(emp.manager_id)}
              </span>
              <span
                className="font-mono w-fit px-2 py-0.5 text-[11px] uppercase"
                style={{ background: 'var(--accent-structure-bg)', color: 'var(--accent-structure)', borderRadius: 'var(--radius-sm)' }}
              >
                {emp.work_mode}
              </span>
              <StatusTag status={emp.employment_status === 'ACTIVE' ? 'present' : 'neutral'} label={emp.employment_status === 'ACTIVE' ? 'Active' : 'Inactive'} />
              {canManage ? (
                <div className="flex items-center gap-3 justify-self-end" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openEdit(emp)}
                    className="font-mono text-[11px] uppercase tracking-wide hover:underline"
                    style={{ color: 'var(--accent-structure)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(emp.id)}
                    className="font-mono text-[11px] uppercase tracking-wide hover:underline"
                    style={{ color: emp.employment_status === 'ACTIVE' ? 'var(--status-absent)' : 'var(--status-present)' }}
                  >
                    {emp.employment_status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      <Drawer open={drawerOpen} title={editingId ? 'Edit employee' : 'Add employee'} onClose={() => setDrawerOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <select
                required
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                className="w-full border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="" disabled>
                  Select…
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Designation">
              <select
                required
                value={form.designation_id}
                onChange={(e) => setForm((f) => ({ ...f, designation_id: e.target.value }))}
                className="w-full border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="" disabled>
                  Select…
                </option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Manager">
            <select
              value={form.manager_id}
              onChange={(e) => setForm((f) => ({ ...f, manager_id: e.target.value }))}
              className="w-full border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              <option value="">None</option>
              {employees
                .filter((e) => e.id !== editingId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Joining date">
              <input
                type="date"
                required
                value={form.joining_date}
                onChange={(e) => setForm((f) => ({ ...f, joining_date: e.target.value }))}
                className="w-full border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Work mode">
              <select
                value={form.work_mode}
                onChange={(e) => setForm((f) => ({ ...f, work_mode: e.target.value as WorkMode }))}
                className="w-full border px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {editingId && (
            <div className="border-t pt-4" style={{ borderColor: 'var(--line-soft)' }}>
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Documents vault
              </span>
              <div className="mt-2 space-y-1.5">
                {documents.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No documents on file.
                  </p>
                ) : (
                  documents.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 border px-3 py-1.5 text-xs"
                      style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-sm)' }}
                    >
                      <span className="flex-1 truncate" style={{ color: 'var(--ink)' }}>
                        {d.name}
                      </span>
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                        {d.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDocument(d.id)}
                        style={{ color: 'var(--status-absent)' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Document name"
                  className="min-w-0 flex-1 border px-2.5 py-1.5 text-xs outline-none"
                  style={inputStyle}
                />
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                  className="border px-2 py-1.5 text-xs outline-none"
                  style={inputStyle}
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!docName.trim()) return;
                    addDocument({ name: docName.trim(), category: docCategory });
                    setDocName('');
                  }}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium"
                  style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
          >
            {editingId ? 'Save changes' : 'Add employee'}
          </button>
        </form>
      </Drawer>

      <Drawer
        open={Boolean(selectedEmployee)}
        title={selectedEmployee ? selectedEmployee.name : 'Employee details'}
        onClose={() => setSelectedEmployeeId(null)}
      >
        {selectedEmployee && (
          <div className="space-y-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {selectedEmployee.employee_code}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedEmployee.email}</span>
                <StatusTag
                  status={selectedEmployee.employment_status === 'ACTIVE' ? 'present' : 'neutral'}
                  label={selectedEmployee.employment_status === 'ACTIVE' ? 'Active' : 'Inactive'}
                />
              </div>
            </div>

            <div className="grid gap-4 border-y py-4" style={{ borderColor: 'var(--line-soft)' }}>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Phone</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedEmployee.phone || '—'}</p></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Department</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{deptName(selectedEmployee.department_id)}</p></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Designation</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{designationName(selectedEmployee.designation_id)}</p></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Manager</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{managerName(selectedEmployee.manager_id)}</p></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Joining date</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedEmployee.joining_date}</p></div>
              <div><p className="font-mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Work mode</p><p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>{selectedEmployee.work_mode}</p></div>
            </div>

            {canManage && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    openEdit(selectedEmployee);
                    setSelectedEmployeeId(null);
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium"
                  style={{ background: 'var(--ink)', color: 'var(--text-on-ink)', borderRadius: 'var(--radius-sm)' }}
                >
                  Edit employee
                </button>
                <button
                  onClick={() => toggleStatus(selectedEmployee.id)}
                  className="border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: 'var(--line)', color: selectedEmployee.employment_status === 'ACTIVE' ? 'var(--status-absent)' : 'var(--status-present)', borderRadius: 'var(--radius-sm)' }}
                >
                  {selectedEmployee.employment_status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
