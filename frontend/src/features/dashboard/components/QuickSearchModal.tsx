import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Building2,
  LayoutDashboard,
  Kanban,
  Users2,
  Plus,
  User,
  ArrowRight,
  Command,
} from 'lucide-react';
import { useWorkspaceStore } from '../../../stores/workspaceStore';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'overview' | 'kanban') => void;
  onOpenProfile: () => void;
  onOpenCreateWorkspace: () => void;
  onOpenMembers: () => void;
}

interface SearchItem {
  id: string;
  category: 'Workspaces' | 'Navigation' | 'Actions';
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
  const inputRef = useRef<HTMLInputElement>(null);

  const { workspaces, setActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const allItems: SearchItem[] = [
    // Navigation items
    {
      id: 'nav-overview',
      category: 'Navigation',
      title: 'Overview & Velocity Metrics',
      subtitle: 'Sprint progress, burndown stats, and high-level health',
      icon: <LayoutDashboard className="w-4 h-4 text-blue-600" />,
      action: () => {
        onNavigateTab('overview');
        onClose();
      },
    },
    {
      id: 'nav-kanban',
      category: 'Navigation',
      title: 'Sprint 1 Interactive Board',
      subtitle: 'Active backlog items, swimlanes, and task transitions',
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
      title: 'User Profile & Settings',
      subtitle: 'Manage display name, view UUID identity, and security tokens',
      icon: <User className="w-4 h-4 text-slate-600" />,
      action: () => {
        onOpenProfile();
        onClose();
      },
    },
    // Dynamic workspaces
    ...workspaces.map((ws) => ({
      id: `ws-${ws.id}`,
      category: 'Workspaces' as const,
      title: ws.name,
      subtitle: `Switch to /${ws.slug} (${ws.current_user_role || 'Member'})`,
      icon: <Building2 className="w-4 h-4 text-blue-600" />,
      action: () => {
        setActiveWorkspace(ws);
        onClose();
      },
    })),
  ];

  // Filter based on query
  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase())) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
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
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search workspaces, boards, actions..."
            className="flex-1 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <span>ESC</span>
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching items found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, index) => {
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

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↑</kbd>
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <Command className="w-3 h-3 text-slate-400" />
            <span>TaskFlow Search</span>
          </div>
        </div>
      </div>
    </div>
  );
};
