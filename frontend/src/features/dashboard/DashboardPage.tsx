import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout/');
    } catch {
      // Proceed with local logout even if server fails
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={logoBadgeStyle}>TF</div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#111827' }}>TaskFlow</h1>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Enterprise Agile Workspace</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>{user?.display_name}</div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>{user?.email}</div>
          </div>
          <button onClick={handleLogout} style={logoutButtonStyle}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={mainContentStyle}>
        {/* Welcome Banner */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={badgeStyle}>Phase 1 & 2 Active</span>
              <h2 style={{ margin: '8px 0 4px 0', fontSize: '22px', fontWeight: 700, color: '#111827' }}>
                Welcome to TaskFlow, {user?.display_name}!
              </h2>
              <p style={{ margin: 0, color: '#4B5563', fontSize: '14px' }}>
                Your enterprise identity and authentication session are active.
              </p>
            </div>
            <a
              href="http://localhost:8000/api/docs/"
              target="_blank"
              rel="noreferrer"
              style={swaggerLinkStyle}
            >
              Open API Docs (Swagger) →
            </a>
          </div>

          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>User ID (UUIDv4)</div>
              <div style={infoValueStyle}>{user?.id}</div>
            </div>
            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Authentication Mode</div>
              <div style={infoValueStyle}>JWT Dual-Token (HttpOnly Rotation)</div>
            </div>
            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Database Engine</div>
              <div style={infoValueStyle}>Supabase PostgreSQL 17</div>
            </div>
            <div style={infoBoxStyle}>
              <div style={infoLabelStyle}>Account Status</div>
              <div style={{ ...infoValueStyle, color: '#059669' }}>Active & Verified</div>
            </div>
          </div>
        </div>

        {/* Roadmap Preview */}
        <div style={{ marginTop: '24px', ...cardStyle }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            Next Phase Preview: Workspaces & Multi-Tenancy (Phase 3)
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', lineHeight: 1.6 }}>
            In the upcoming phase, we will implement multi-tenant Workspaces with invite codes, role-based access control (Admin, Member, Viewer), and complete workspace-level data isolation.
          </p>
        </div>
      </main>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#F9FAFB',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid #E5E7EB',
  padding: '12px 28px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const logoBadgeStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  backgroundColor: '#2563EB',
  color: '#FFFFFF',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '16px',
};

const logoutButtonStyle: React.CSSProperties = {
  backgroundColor: '#F3F4F6',
  color: '#374151',
  border: '1px solid #D1D5DB',
  borderRadius: '6px',
  padding: '6px 14px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

const mainContentStyle: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '32px auto',
  padding: '0 16px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  border: '1px solid #E5E7EB',
  padding: '24px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#DBEAFE',
  color: '#1D4ED8',
  fontSize: '11px',
  fontWeight: 600,
  padding: '3px 8px',
  borderRadius: '9999px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const swaggerLinkStyle: React.CSSProperties = {
  backgroundColor: '#EFF6FF',
  color: '#2563EB',
  border: '1px solid #BFDBFE',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 500,
  textDecoration: 'none',
  display: 'inline-block',
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '12px 14px',
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#6B7280',
  textTransform: 'uppercase',
  marginBottom: '4px',
};

const infoValueStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1F2937',
  wordBreak: 'break-all',
};
