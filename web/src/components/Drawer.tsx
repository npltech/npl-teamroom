import { useEffect, type ReactNode } from 'react';

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(27,36,48,0.35)' }}
      />
      <div
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        style={{ borderLeft: '1px solid var(--line)' }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: 'var(--line-soft)' }}
        >
          <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-xs uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Close ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
