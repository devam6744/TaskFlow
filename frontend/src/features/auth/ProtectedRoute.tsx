import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, setAuth, logout } = useAuthStore();

  useEffect(() => {
    // Attempt silent session recovery if unauthenticated on fresh page reload
    if (!isAuthenticated) {
      apiClient
        .get('/auth/me/')
        .then((response) => {
          // Token is valid
          setAuth(response.data, useAuthStore.getState().accessToken || '');
        })
        .catch(() => {
          // Cookie refresh will be attempted via axios interceptor or fails to logout
          logout();
        });
    }
  }, [isAuthenticated, setAuth, logout]);

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading TaskFlow workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
