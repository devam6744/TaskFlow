import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Kanban,
  Users2,
  FolderGit2,
  Plus,
  User,
  FileText,
  Flame,
  Loader2,
  BarChart2,
} from 'lucide-react';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useProjectStore } from '../../../stores/projectStore';
import { analyticsApi } from '../../analytics/analyticsApi';
import type { SearchResultItem } from '../../analytics/types';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'overview' | 'kanban' | 'backlog' | 'analytics') => void;
  onOpenProfile: () => void;
  onOpenCreateWorkspace: () => void;
  onOpenMembers: () => void;
}

interface SearchItem {
  id: string;
  category: 'Work Items' | 'Sprints' | 'Projects' | 'Workspaces' | 'Navigation' | 'Actions';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenProfile,
  onOpenCreateWorkspace,
  onOpenMembers,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [remoteResults, setRemoteResults] = useState<{
    work_items: SearchResultItem[];
    sprints: SearchResultItem[];
    projects: SearchResultItem[];
  }>({ work_items: [], sprints: [], projects: [] });

  const inputRef = useRef<HTMLInputElement>(null);

  const { activeWorkspace } = useWorkspaceStore();
  const { projects, setActiveProject } = useProjectStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setRemoteResults({ work_items: [], sprints: [], projects: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced API search when query changes
  useEffect(() => {
    if (!isOpen || !activeWorkspace || query.trim().length < 2) {
      setRemoteResults({ work_items: [], sprints: [], projects: [] });
      setSearching(false);
      return;
    }

    setSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await analyticsApi.globalSearch(activeWorkspace.slug, query.trim());
        setRemoteResults({
          work_items: res.work_items || [],
          sprints: res.sprints || [],
          projects: res.projects || [],
        });
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query, isOpen, activeWorkspace]);

  // Build items array
  const allItems: SearchItem[] = [];

  // A. If remote results exist, show them first
  if (remoteResults.work_items.length > 0) {
    remoteResults.work_items.forEach((item) => {
      allItems.push({
        id: `wi-${item.id}`,
        category: 'Work Items',
        title: `${item.key_identifier}: ${item.title}`,
        subtitle: `${item.project_name} • ${item.status} • ${item.priority} Priority`,
        icon: <FileText className="w-4 h-4 text-blue-600" />,
        action: () => {
          if (item.project_slug) {
            const matchedProj = projects.find((p) => p.slug === item.project_slug);
            if (matchedProj) setActiveProject(matchedProj);
          }
          onNavigateTab('backlog');
          onClose();
        },
      });
    });
  }

  if (remoteResults.sprints.length > 0) {
    remoteResults.sprints.forEach((sprint) => {
      allItems.push({
        id: `sprint-${sprint.id}`,
        category: 'Sprints',
        title: sprint.name || 'Sprint',
        subtitle: `${sprint.project_name} • ${sprint.status} • Goal: ${sprint.sprint_goal || 'No goal set'}`,
        icon: <Flame className="w-4 h-4 text-emerald-600" />,
        action: () => {
          if (sprint.project_slug) {
            const matchedProj = projects.find((p) => p.slug === sprint.project_slug);
            if (matchedProj) setActiveProject(matchedProj);
          }
          onNavigateTab(sprint.status === 'ACTIVE' ? 'kanban' : 'backlog');
          onClose();
        },
      });
    });
  }

  if (remoteResults.projects.length > 0) {
    remoteResults.projects.forEach((proj) => {
      allItems.push({
        id: `proj-${proj.id}`,
        category: 'Projects',
        title: `${proj.name} [${proj.key}]`,
        subtitle: proj.description || `${proj.visibility} Project`,
        icon: <FolderGit2 className="w-4 h-4 text-indigo-600" />,
        action: () => {
          const matchedProj = projects.find((p) => p.slug === proj.slug);
          if (matchedProj) setActiveProject(matchedProj);
          onNavigateTab('backlog');
          onClose();
        },
      });
    });
  }

  // B. Standard Navigation & Actions
  const navItems: SearchItem[] = [
    {
      id: 'nav-overview',
      category: 'Navigation',
      title: 'Executive Pulse & Dashboard',
      subtitle: 'Assigned tasks, active sprints, and engineering activity',
      icon: <LayoutDashboard className="w-4 h-4 text-blue-600" />,
      action: () => {
        onNavigateTab('overview');
        onClose();
      },
    },
    {
      id: 'nav-analytics',
      category: 'Navigation',
      title: 'Sprint Reports & Burndown Analytics',
      subtitle: 'Daily burndown charts, team velocity, and delivery metrics',
      icon: <BarChart2 className="w-4 h-4 text-indigo-600" />,
      action: () => {
        onNavigateTab('analytics');
        onClose();
      },
    },
    {
      id: 'nav-backlog',
      category: 'Navigation',
      title: 'Product Backlog',
      subtitle: 'Manage user stories, tasks, bugs, and Fibonacci estimates',
      icon: <FolderGit2 className="w-4 h-4 text-blue-600" />,
      action: () => {
        onNavigateTab('backlog');
        onClose();
      },
    },
    {
      id: 'nav-kanban',
      category: 'Navigation',
      title: 'Active Sprint Kanban Board',
      subtitle: 'Swimlanes, live drag-and-drop, and task transitions',
      icon: <Kanban className="w-4 h-4 text-blue-600" />,
      action: () => {
        onNavigateTab('kanban');
        onClose();
      },
    },
    {
      id: 'nav-members',
      category: 'Navigation',
      title: 'Workspace Team & Roles',
      subtitle: 'View active members, invite teammates, and manage permissions',
      icon: <Users2 className="w-4 h-4 text-indigo-600" />,
      action: () => {
        onOpenMembers();
        onClose();
      },
    },
    {
      id: 'action-create-workspace',
      category: 'Actions',
      title: 'Create New Workspace',
      subtitle: 'Set up an isolated multi-tenant environment for a new team',
      icon: <Plus className="w-4 h-4 text-emerald-600" />,
      action: () => {
        onOpenCreateWorkspace();
        onClose();
      },
    },
    {
      id: 'action-profile',
      category: 'Actions',
      title: 'Manage Your Profile & Security',
      subtitle: 'Account details and credentials',
      icon: <User className="w-4 h-4 text-slate-600" />,
      action: () => {
        onOpenProfile();
        onClose();
      },
    },
  ];

  if (!query.trim()) {
    allItems.push(...navItems);
  } else if (allItems.length === 0) {
    // If no remote results matched yet, filter local navigation items
    const filteredNav = navItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
    );
    allItems.push(...filteredNav);
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-100 flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          {searching ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets (e.g. ALP-1), sprints, projects, or commands..."
            className="flex-1 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <span>ESC</span>
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching tickets, sprints, or commands found for "{query}".
            </div>
          ) : (
            allItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate mr-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-white border-blue-200 shadow-2xs'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <div className="truncate font-semibold text-slate-900">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0 bg-slate-100/80 px-1.5 py-0.5 rounded">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1 rounded text-[10px]">↑</kbd>
              <kbd className="font-mono bg-white border border-slate-200 px-1 rounded text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white border border-slate-200 px-1 rounded text-[10px]">↵</kbd>
              Open
            </span>
          </div>
          <span>Full-Text Scoped Search</span>
        </div>
      </div>
    </div>
  );
};
