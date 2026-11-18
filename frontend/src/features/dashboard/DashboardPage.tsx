import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  LayoutDashboard,
  Building2,
  FolderGit2,
  Kanban,
  Users2,
  BarChart3,
  Search,
  ExternalLink,
  LogOut,
  Copy,
  Check,
  Shield,
  Database,
  KeyRound,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';
import { apiClient } from '../../lib/api';
import { MetricsCards } from './components/MetricsCards';
import { KanbanBoard } from './components/KanbanBoard';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const addToast = useToast((state) => state.addToast);
  const navigate = useNavigate();

  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'kanban' | 'architecture'>('overview');

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      addToast({
        type: 'success',
        title: 'Copied User UUID',
        description: 'UUID copied to your system clipboard.',
      });
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout/');
    } catch {
      // Proceed even if server response fails
    } finally {
      logout();
      addToast({
        type: 'info',
        title: 'Session Terminated',
        description: 'You have been securely signed out.',
      });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Enterprise Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Left: Brand + Breadcrumbs */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 border border-indigo-400/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold tracking-tight text-white text-base">TaskFlow</span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Enterprise
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 pl-4 border-l border-slate-800">
            <span className="text-slate-200 font-medium">TaskFlow Core</span>
            <span>/</span>
            <span className="text-indigo-400 font-semibold">Sprint 1 Pipeline</span>
          </div>
        </div>

        {/* Center: Command Palette Search */}
        <div className="hidden lg:flex items-center w-72">
          <div className="w-full relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              placeholder="Search issues, sprints, docs..."
              className="w-full pl-9 pr-12 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-300 placeholder-slate-500 cursor-pointer hover:border-slate-700 transition-colors"
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Command Palette',
                  description: 'Global fuzzy search will be activated in Phase 9.',
                })
              }
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right: Actions + User Profile */}
        <div className="flex items-center gap-3">
          {/* Swagger link */}
          <a
            href="http://localhost:8000/api/docs/"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all"
          >
            <span>Swagger API</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* User profile dropdown pill */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {user?.display_name?.substring(0, 2).toUpperCase() || 'TF'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-200 leading-none">{user?.display_name}</div>
              <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate max-w-[130px]">
                {user?.email}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-950 p-4 hidden md:flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            {/* Navigation Group */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
                Agile Workspace
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Overview & Metrics</span>
                </button>

                <button
                  onClick={() => setActiveTab('kanban')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'kanban'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Kanban className="w-4 h-4" />
                  <span>Sprint 1 Board</span>
                </button>

                <button
                  onClick={() => setActiveTab('architecture')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'architecture'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Security & Architecture</span>
                </button>
              </nav>
            </div>

            {/* Upcoming Roadmap Group */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
                Upcoming Modules
              </div>
              <nav className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-900/40 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <span>Workspaces</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">P3</span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-900/40 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <FolderGit2 className="w-4 h-4 text-slate-600" />
                    <span>Projects & Backlog</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">P4</span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-900/40 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <Users2 className="w-4 h-4 text-slate-600" />
                    <span>Collaboration</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">P6</span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-900/40 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-slate-600" />
                    <span>Velocity Reports</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">P9</span>
                </div>
              </nav>
            </div>
          </div>

          {/* Bottom System Status Widget */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Supabase PG 17</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>JWT TTL:</span>
              <span className="font-mono text-indigo-400 font-semibold">15m / 7d rot</span>
            </div>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Greeting Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-slate-900/80 border border-indigo-900/40 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 font-medium mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Phase 1 & 2 Identity Layer Operational</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Welcome, {user?.display_name}!
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Your enterprise session is active with atomic PostgreSQL transactions and JWT rotation.
                </p>
              </div>

              {/* UUID Copyable Pill */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <button
                  onClick={handleCopyId}
                  className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-mono text-slate-300 flex items-center gap-2 transition-all cursor-pointer group"
                >
                  <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">UUID:</span>
                  <span className="truncate max-w-[130px] font-semibold">{user?.id}</span>
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Metrics KPI Cards */}
            <MetricsCards />

            {/* Tab Views */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <KanbanBoard />
              </div>
            )}

            {activeTab === 'kanban' && (
              <div>
                <KanbanBoard />
              </div>
            )}

            {activeTab === 'architecture' && (
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <span>Active Security & Architectural Invariants</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    System specifications implemented in Phase 1 & 2 for enterprise compliance.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                      <KeyRound className="w-4 h-4" />
                      <span>Dual-Token Strategy</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Access tokens reside solely in React memory (Zustand). Refresh tokens are sealed in HttpOnly, SameSite=Lax cookies, immune to JavaScript XSS theft.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <Database className="w-4 h-4" />
                      <span>UUIDv4 Primary Keys</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      All tables use 128-bit cryptographically random UUIDs instead of auto-increment integers, eliminating IDOR enumeration attacks and leaking tenant volumes.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                      <BookOpen className="w-4 h-4" />
                      <span>Learning Documentation</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Detailed conceptual guides, ADR decision logs, and milestone completion reports are maintained under the root <code className="text-indigo-300">docs/</code> directory.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
