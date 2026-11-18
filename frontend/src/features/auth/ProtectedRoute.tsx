import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Loading TaskFlow workspace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
