import { Link } from 'react-router-dom';

interface QuickLink {
  label: string;
  path: string;
}

export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <div className="border bg-white" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
      <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--line-soft)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Quick links
        </h3>
      </div>
      <div className="flex flex-wrap gap-2 p-5">
        {links.map((l) => (
          <Link
            key={l.path}
            to={l.path}
            className="border px-3.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--paper)]"
            style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}
          >
            {l.label} →
          </Link>
        ))}
      </div>
    </div>
  );
}
