interface RosterEvent {
  time: string;
  label: string;
  status: 'present' | 'pending' | 'absent' | 'neutral';
}

const STATUS_COLOR: Record<RosterEvent['status'], string> = {
  present: 'var(--status-present)',
  pending: 'var(--status-pending)',
  absent: 'var(--status-absent)',
  neutral: 'var(--status-neutral)',
};

/**
 * The Roster Strip — this app's signature element.
 * A vertical, time-stamped ledger of a day's events, styled after a
 * punch-card / attendance register rather than a generic timeline.
 * Reused on the login hero panel and the "Today" dashboard widget.
 */
export function RosterStrip({ events, dim = false }: { events: RosterEvent[]; dim?: boolean }) {
  return (
    <ol className="relative" style={{ opacity: dim ? 0.55 : 1 }}>
      {events.map((event, i) => (
        <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
          {i < events.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[5px] top-3 bottom-0 w-px"
              style={{ background: 'var(--line-soft)' }}
            />
          )}
          <span
            aria-hidden
            className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4"
            style={{
              background: STATUS_COLOR[event.status],
              boxShadow: `0 0 0 4px ${dim ? 'transparent' : 'rgba(241,242,237,0.06)'}`,
            }}
          />
          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
            <span className="text-sm" style={{ color: 'var(--text-on-ink)' }}>
              {event.label}
            </span>
            <span
              className="font-mono text-xs shrink-0"
              style={{ color: 'var(--text-on-ink-muted)' }}
            >
              {event.time}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export type { RosterEvent };
