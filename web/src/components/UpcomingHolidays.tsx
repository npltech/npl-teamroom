import { Link } from 'react-router-dom';
import { formatHolidayDate, upcomingHolidays, useHolidays } from '../data/holidays';

export function UpcomingHolidays({ canManage = false }: { canManage?: boolean }) {
  const { holidays } = useHolidays();
  const upcoming = upcomingHolidays(holidays);

  return (
    <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
      <div
        className="flex items-center justify-between border-b px-5 py-3.5"
        style={{ borderColor: 'var(--line-soft)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Upcoming holidays
        </h3>
        <Link
          to="/holidays"
          className="font-mono text-[11px] uppercase tracking-wide hover:underline"
          style={{ color: 'var(--accent-holiday)' }}
        >
          {canManage ? 'Manage' : 'View all'}
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          No upcoming holidays on the calendar.
        </p>
      ) : (
        <ul>
          {upcoming.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-4 border-b px-5 py-3 last:border-b-0"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center font-mono text-[10px] font-medium uppercase"
                style={{
                  background: 'var(--accent-holiday-bg)',
                  color: 'var(--accent-holiday)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {h.date.slice(8, 10)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {h.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatHolidayDate(h.date)} · {h.type}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
