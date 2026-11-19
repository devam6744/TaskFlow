import React, { useState, useEffect } from 'react';
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
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { apiClient } from '../../lib/api';
import { MetricsCards } from './components/MetricsCards';
import { KanbanBoard } from './components/KanbanBoard';
import { ProfileModal } from './components/ProfileModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { WorkspaceSwitcher } from '../workspaces/WorkspaceSwitcher';
import { CreateWorkspaceModal } from '../workspaces/CreateWorkspaceModal';
import { WorkspaceMembersModal } from '../workspaces/WorkspaceMembersModal';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const addToast = useToast((state) => state.addToast);
  const navigate = useNavigate();

  const { activeWorkspace, workspaces, fetchWorkspaces } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'kanban'>('overview');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Initial load: fetch workspaces
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Global keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      navigate('/');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white overflow-hidden">
      {/* Top Header - Fixed & Elevated (z-30) */}
      <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs">
        {/* Left: Mobile Toggle + Logo + Workspace Switcher */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle Navigation"
          >
            {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2 group shrink-0">
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

          {/* Workspace Switcher */}
          <div className="pl-2 sm:pl-4 sm:border-l sm:border-slate-200">
            <WorkspaceSwitcher
              onOpenCreateModal={() => setCreateWorkspaceModalOpen(true)}
              onOpenMembersModal={() => setMembersModalOpen(true)}
            />
          </div>
        </div>

        {/* Center: Command Palette / Quick Search Trigger */}
        <div className="hidden md:flex items-center w-64 lg:w-80">
          <button
            type="button"
            onClick={() => setQuickSearchOpen(true)}
            className="w-full relative flex items-center pl-9 pr-12 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all cursor-pointer text-left shadow-2xs group"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-hover:text-blue-600 transition-colors" />
            <span className="truncate">Search issues, boards, teams...</span>
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 group-hover:border-slate-300">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Search icon on mobile + Profile Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setQuickSearchOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Quick Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
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

      {/* Main Workspace Layout - Flex row with clean scroll boundary */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 md:z-10 shrink-0 overflow-y-auto ${
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'kanban'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Kanban className="w-4 h-4 text-blue-600" />
                  <span>Sprint 1 Board</span>
                </button>

                {activeWorkspace && (
                  <button
                    onClick={() => {
                      setMembersModalOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Users2 className="w-4 h-4 text-indigo-600" />
                      <span>Team & Members</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {activeWorkspace.members_count}
                    </span>
                  </button>
                )}
              </nav>
            </div>

            {/* Upcoming Roadmap Modules */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                SDLC Roadmap
              </div>
              <nav className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 font-medium">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Workspaces</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    Phase 3 Active
                  </span>
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
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span>Manage Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Main Workspace Content Canvas - Scrollable Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* If user has no workspaces, show empty state helper banner */}
            {workspaces.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Welcome to TaskFlow, {user?.display_name}!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                    To start organizing your Scrum sprints and projects, create your first team workspace.
                  </p>
                </div>
                <button
                  onClick={() => setCreateWorkspaceModalOpen(true)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Workspace</span>
                </button>
              </div>
            ) : (
              /* Welcome Banner */
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{activeWorkspace?.name || 'Workspace'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-[11px] text-slate-400">/{activeWorkspace?.slug}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Welcome, {user?.display_name}!
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1">
                    Multi-tenant workspace isolation active. Sprint 1 execution on schedule.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setMembersModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Users2 className="w-4 h-4 text-indigo-600" />
                    <span>Manage Members</span>
                  </button>

                  <button
                    onClick={() => setProfileModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Account Profile</span>
                  </button>
                </div>
              </div>
            )}

            {/* Metrics KPI Cards */}
            <MetricsCards />

            {/* Interactive Sprint Kanban Board */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
              <KanbanBoard />
            </div>
          </div>
        </main>
      </div>

      {/* Quick Search Palette (Ctrl+K) */}
      <QuickSearchModal
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenCreateWorkspace={() => setCreateWorkspaceModalOpen(true)}
        onOpenMembers={() => setMembersModalOpen(true)}
      />

      {/* Manageable Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onLogout={handleLogout}
      />

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={createWorkspaceModalOpen}
        onClose={() => setCreateWorkspaceModalOpen(false)}
      />

      {/* Workspace Members & Invitations Modal */}
      <WorkspaceMembersModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
      />
    </div>
  );
};
