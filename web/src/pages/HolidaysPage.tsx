import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useEmployees } from '../data/employees';
import { formatHolidayDate, useHolidays, type HolidayCategory } from '../data/holidays';
import type { Role } from '../data/roles';

type Ctx = { role: Role };
type FilterKey = 'ALL' | 'Holiday' | 'Announcement' | 'Birthday' | 'Anniversary';

type CalendarRow = {
  id: string;
  date: string;
  name: string;
  kind: 'Holiday' | 'Announcement' | 'Birthday' | 'Anniversary';
  group: HolidayCategory | 'Birthday' | 'Anniversary';
  readOnly: boolean;
  source: 'manual' | 'generated';
};

const FILTERS: FilterKey[] = ['ALL', 'Holiday', 'Announcement', 'Birthday', 'Anniversary'];
const CATEGORY_OPTIONS: HolidayCategory[] = ['National Holiday', 'Optional Holiday', 'Company Holiday', 'Announcement'];

function rowStyle(group: CalendarRow['group']) {
  switch (group) {
    case 'National Holiday':
    case 'Optional Holiday':
    case 'Company Holiday':
      return { background: 'var(--accent-holiday-bg)', color: 'var(--accent-holiday)' };
    case 'Announcement':
      return { background: '#E0F2FE', color: '#0F766E' };
    case 'Birthday':
      return { background: '#F3F4F6', color: '#475467' };
    case 'Anniversary':
      return { background: '#F5F3FF', color: '#6D28D9' };
  }
}

export default function HolidaysPage() {
  const { role } = useOutletContext<Ctx>();
  const canManage = role === 'SUPER_ADMIN' || role === 'HR';
  const { holidays, addHoliday, removeHoliday } = useHolidays();
  const { employees } = useEmployees();

  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HolidayCategory>('Company Holiday');
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const generatedRows = useMemo<CalendarRow[]>(() => {
    const rows: CalendarRow[] = [];
    const thisYear = new Date().getFullYear();

    employees.forEach((employee) => {
      if (employee.date_of_birth) {
        const dob = new Date(`${employee.date_of_birth}T00:00:00`);
        const birthday = new Date(thisYear, dob.getMonth(), dob.getDate());
        rows.push({
          id: `birthday-${employee.id}`,
          date: birthday.toISOString().slice(0, 10),
          name: `${employee.name}'s birthday`,
          kind: 'Birthday',
          group: 'Birthday',
          readOnly: true,
          source: 'generated',
        });
      }

      const joined = new Date(`${employee.joining_date}T00:00:00`);
      const years = thisYear - joined.getFullYear();
      if (years > 0) {
        const anniversary = new Date(thisYear, joined.getMonth(), joined.getDate());
        rows.push({
          id: `anniversary-${employee.id}`,
          date: anniversary.toISOString().slice(0, 10),
          name: `${employee.name}'s ${years}-year work anniversary`,
          kind: 'Anniversary',
          group: 'Anniversary',
          readOnly: true,
          source: 'generated',
        });
      }
    });

    return rows;
  }, [employees]);

  const combined = useMemo<CalendarRow[]>(() => {
    const manual: CalendarRow[] = holidays.map((h) => ({
      id: h.id,
      date: h.date,
      name: h.name,
      kind: h.category === 'Announcement' ? 'Announcement' : 'Holiday',
      group: h.category,
      readOnly: false,
      source: 'manual',
    }));

    return [...manual, ...generatedRows].sort((a, b) => a.date.localeCompare(b.date));
  }, [generatedRows, holidays]);

  const filtered = combined.filter((row) => {
    if (filter === 'ALL') return true;
    if (filter === 'Holiday') return row.kind === 'Holiday';
    return row.kind === filter;
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name.trim()) return;
    addHoliday({ date, name: name.trim(), category });
    setDate('');
    setName('');
    setCategory('Company Holiday');
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--accent-holiday)' }}>
        Calendar
      </p>
      <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Holidays & Events
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {canManage
          ? 'Manage public holidays, announcements, birthday, and anniversary reminders.'
          : 'The organization calendar and key employee milestones.'}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors"
            style={{
              background: filter === tab ? 'var(--ink)' : 'white',
              color: filter === tab ? 'var(--text-on-ink)' : 'var(--text-secondary)',
              borderColor: 'var(--line)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={`mt-6 grid gap-6 ${canManage ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
          <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} in view
            </h3>
          </div>
          {filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No items in this category yet.
            </p>
          ) : (
            <ul>
              {filtered.map((row) => {
                const isPast = row.date < today;
                const tag = rowStyle(row.group);
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-4 border-b px-5 py-3.5 last:border-b-0"
                    style={{ borderColor: 'var(--line-soft)', opacity: isPast ? 0.6 : 1 }}
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center leading-none"
                      style={{
                        background: 'var(--accent-holiday-bg)',
                        color: 'var(--accent-holiday)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span className="font-mono text-sm font-semibold">{row.date.slice(8, 10)}</span>
                      <span className="font-mono text-[9px] uppercase">
                        {new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                        {row.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatHolidayDate(row.date)}
                      </p>
                    </div>
                    <span className="font-mono px-2 py-0.5 text-[10px] uppercase" style={{ ...tag, borderRadius: 'var(--radius-sm)' }}>
                      {row.group}
                    </span>
                    {canManage && row.source === 'manual' && (
                      <button
                        onClick={() => removeHoliday(row.id)}
                        className="font-mono text-[11px] uppercase tracking-wide hover:underline"
                        style={{ color: 'var(--status-absent)' }}
                        aria-label={`Remove ${row.name}`}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {canManage && (
          <div
            className="h-fit border bg-white p-5"
            style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Add an item
            </h3>
            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Date
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Name
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Town hall"
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as HolidayCategory)}
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent-holiday)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
              >
                Add item
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
