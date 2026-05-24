import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-appbg text-primaryText flex items-center justify-center">
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-secondaryText shadow-terminal">
          Loading…
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
