import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login/', {
        email,
        password,
      });

      const { user, access } = response.data;
      setAuth(user, access);
      navigate('/');
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait 1 minute before trying again.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Unable to log in. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', margin: 0 }}>TaskFlow</h1>
          <p style={{ color: '#6B7280', marginTop: '6px', fontSize: '14px' }}>
            Enterprise Scrum & Project Management
          </p>
        </div>

        {error && (
          <div style={errorAlertStyle}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#6B7280' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F9FAFB',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  padding: '32px',
  border: '1px solid #E5E7EB',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid #D1D5DB',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px',
  backgroundColor: '#2563EB',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'background-color 0.2s',
};

const errorAlertStyle: React.CSSProperties = {
  backgroundColor: '#FEE2E2',
  color: '#991B1B',
  padding: '10px 14px',
  borderRadius: '6px',
  fontSize: '13px',
  marginBottom: '16px',
  border: '1px solid #F87171',
};
