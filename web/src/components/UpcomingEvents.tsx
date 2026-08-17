import type { CompanyEvent } from '../data/events';

const KIND_LABEL: Record<CompanyEvent['kind'], string> = {
  announcement: 'Announcement',
  anniversary: 'Anniversary',
  birthday: 'Birthday',
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

export function UpcomingEvents({ events }: { events: CompanyEvent[] }) {
  return (
    <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
      <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Upcoming events
        </h3>
      </div>
      {events.length === 0 ? (
        <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
          Nothing on the calendar right now.
        </p>
      ) : (
        <ul>
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-4 border-b px-5 py-3 last:border-b-0"
              style={{ borderColor: 'var(--line-soft)' }}
            >
              <span className="h-8 w-[3px] shrink-0" style={{ background: 'var(--accent-structure)' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {e.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(e.date)} · {KIND_LABEL[e.kind]}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
