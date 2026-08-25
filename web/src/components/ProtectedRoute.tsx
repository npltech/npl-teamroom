import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--paper)' }}>
        <p className="font-mono text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Loading…
        </p>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}