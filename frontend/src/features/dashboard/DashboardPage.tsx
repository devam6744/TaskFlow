import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  LayoutDashboard,
  Building2,
  FolderGit2,
  Kanban,
  Users2,
  BarChart3,
  Search,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';
import { apiClient } from '../../lib/api';
import { MetricsCards } from './components/MetricsCards';
import { KanbanBoard } from './components/KanbanBoard';
import { ProfileModal } from './components/ProfileModal';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const addToast = useToast((state) => state.addToast);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'kanban'>('overview');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout/');
    } catch {
      // Proceed even if server response fails
    } finally {
      logout();
      setProfileModalOpen(false);
      addToast({
        type: 'info',
        title: 'Signed Out',
        description: 'You have been securely signed out.',
      });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Mobile Toggle + Logo + Workspace Breadcrumb */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle Navigation"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex items-baseline gap-1.5">
              <span className="font-bold tracking-tight text-slate-900 text-base">TaskFlow</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Enterprise
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pl-4 border-l border-slate-200">
            <span className="text-slate-700 font-semibold">Core Engineering</span>
            <span>/</span>
            <span className="text-blue-600 font-semibold">Sprint 1</span>
          </div>
        </div>

        {/* Center: Command Search */}
        <div className="hidden md:flex items-center w-64 lg:w-80">
          <div className="w-full relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              readOnly
              placeholder="Search issues, sprints..."
              className="w-full pl-9 pr-12 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 cursor-pointer hover:border-slate-300 transition-colors"
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Search Palette',
                  description: 'Global issue search will be activated in Phase 9.',
                })
              }
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Right: Manageable Profile Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {user?.display_name?.substring(0, 2).toUpperCase() || 'TF'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight flex items-center gap-1">
                <span>{user?.display_name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                {user?.email}
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="space-y-6">
            {/* Active Sprint Navigation */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Agile Workspace
              </div>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('overview');
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>Overview & Metrics</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('kanban');
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'kanban'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Kanban className="w-4 h-4 text-blue-600" />
                  <span>Sprint 1 Board</span>
                </button>
              </nav>
            </div>

            {/* Upcoming Roadmap Modules */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Upcoming Modules
              </div>
              <nav className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Workspaces</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">P3</span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <FolderGit2 className="w-4 h-4 text-slate-400" />
                    <span>Projects & Backlog</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">P4</span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <Users2 className="w-4 h-4 text-slate-400" />
                    <span>Collaboration</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">P6</span>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-not-allowed">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <span>Velocity Reports</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">P9</span>
                </div>
              </nav>
            </div>
          </div>

          {/* Quick Profile & Logout Link at bottom */}
          <div className="pt-4 border-t border-slate-200 space-y-1">
            <button
              onClick={() => {
                setProfileModalOpen(true);
                setMobileSidebarOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span>Manage Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Main Workspace Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Banner */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome, {user?.display_name}!
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Active sprint execution is on schedule with 68% velocity completion.
                </p>
              </div>

              <button
                onClick={() => setProfileModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-blue-600" />
                <span>Account Profile</span>
              </button>
            </div>

            {/* Metrics KPI Cards */}
            <MetricsCards />

            {/* Interactive Sprint Kanban Board */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <KanbanBoard />
            </div>
          </div>
        </main>
      </div>

      {/* Manageable Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onLogout={handleLogout}
      />
    </div>
  );
};
