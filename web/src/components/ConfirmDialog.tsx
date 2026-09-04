import { useEffect } from 'react';

export function ConfirmDialog({
    open,
    message,
    onConfirm,
    onCancel,
}: {
    open: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    useEffect(() => {
        if (!open) return undefined;
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onCancel();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-message">
            <button type="button" aria-label="Close confirmation dialog" onClick={onCancel} className="absolute inset-0" style={{ background: 'rgba(27,36,48,0.45)' }} />
            <div className="relative w-full max-w-sm border bg-white p-6 shadow-xl" style={{ borderColor: 'var(--line-soft)', borderRadius: 'var(--radius-md)' }}>
                <p id="confirm-dialog-message" className="text-sm leading-6" style={{ color: 'var(--ink)' }}>{message}</p>
                <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="border px-4 py-2 text-sm font-medium" style={{ borderColor: 'var(--line)', color: 'var(--ink)', borderRadius: 'var(--radius-sm)' }}>No</button>
                    <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium" style={{ background: 'var(--ink)', color: '#fff', borderRadius: 'var(--radius-sm)' }}>Yes</button>
                </div>
            </div>
        </div>
    );
}
