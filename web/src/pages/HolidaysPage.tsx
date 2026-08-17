import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { formatHolidayDate, useHolidays, type Holiday } from '../data/holidays';
import type { Role } from '../data/roles';

type Ctx = { role: Role };

const TYPES: Holiday['type'][] = ['National', 'Optional', 'Company'];

export default function HolidaysPage() {
  const { role } = useOutletContext<Ctx>();
  const canManage = role === 'SUPER_ADMIN' || role === 'HR';
  const { holidays, addHoliday, removeHoliday } = useHolidays();

  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<Holiday['type']>('Company');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name.trim()) return;
    addHoliday({ date, name: name.trim(), type });
    setDate('');
    setName('');
    setType('Company');
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--accent-holiday)' }}>
        Calendar
      </p>
      <h1 className="font-display mt-1 text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
        Holidays
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {canManage
          ? 'Add and manage the organization holiday calendar. Every employee sees this list.'
          : 'The organization holiday calendar, set by HR.'}
      </p>

      <div className={`mt-6 grid gap-6 ${canManage ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
        <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
          <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              {holidays.length} holiday{holidays.length !== 1 ? 's' : ''} on the calendar
            </h3>
          </div>
          {holidays.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No holidays added yet.
            </p>
          ) : (
            <ul>
              {holidays.map((h) => {
                const isPast = h.date < today;
                return (
                  <li
                    key={h.id}
                    className="flex items-center gap-4 border-b px-5 py-3.5 last:border-b-0"
                    style={{ borderColor: 'var(--line-soft)', opacity: isPast ? 0.5 : 1 }}
                  >
                    <span
                      className="flex h-11 w-11 shrink-0 flex-col items-center justify-center leading-none"
                      style={{
                        background: 'var(--accent-holiday-bg)',
                        color: 'var(--accent-holiday)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span className="font-mono text-sm font-semibold">{h.date.slice(8, 10)}</span>
                      <span className="font-mono text-[9px] uppercase">
                        {new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                        {h.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatHolidayDate(h.date)}
                      </p>
                    </div>
                    <span
                      className="font-mono text-[11px] uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h.type}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => removeHoliday(h.id)}
                        className="font-mono text-[11px] uppercase tracking-wide hover:underline"
                        style={{ color: 'var(--status-absent)' }}
                        aria-label={`Remove ${h.name}`}
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
              Add a holiday
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
                  placeholder="e.g. Independence Day"
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                  Type
                </span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Holiday['type'])}
                  className="mt-1.5 w-full border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-sm)' }}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent-holiday)', color: '#fff', borderRadius: 'var(--radius-sm)' }}
              >
                Add holiday
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
