import { useLocation } from 'react-router-dom';

export default function PlaceholderPage() {
  const location = useLocation();
  const name = location.pathname.replace('/', '') || 'section';

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center border border-dashed text-center"
      style={{ borderColor: 'var(--line)', borderRadius: 'var(--radius-md)' }}
    >
      <p className="font-mono text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
        Not built yet
      </p>
      <h2 className="font-display mt-2 text-xl font-medium capitalize" style={{ color: 'var(--ink)' }}>
        {name}
      </h2>
      <p className="mt-1.5 max-w-xs text-sm" style={{ color: 'var(--text-secondary)' }}>
        This section is scaffolded in navigation and ready for its module to be built next.
      </p>
    </div>
  );
}
