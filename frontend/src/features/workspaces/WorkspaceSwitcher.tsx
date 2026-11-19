import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Users2,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Eye,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Workspace } from '../../stores/workspaceStore';

interface WorkspaceSwitcherProps {
  onOpenCreateModal: () => void;
  onOpenMembersModal?: () => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  onOpenCreateModal,
  onOpenMembersModal,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspaceStore();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleIcon = (role: string | null | undefined) => {
    switch (role) {
      case 'OWNER':
        return <ShieldCheck className="w-3 h-3 text-purple-600" />;
      case 'ADMIN':
        return <ShieldAlert className="w-3 h-3 text-blue-600" />;
      case 'MEMBER':
        return <Shield className="w-3 h-3 text-emerald-600" />;
      case 'VIEWER':
      default:
        return <Eye className="w-3 h-3 text-slate-500" />;
    }
  };

  const getRoleBadgeStyle = (role: string | null | undefined) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADMIN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MEMBER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'VIEWER':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white transition-all cursor-pointer text-left shadow-2xs group"
      >
        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="max-w-[140px] sm:max-w-[180px]">
          <div className="text-xs font-semibold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
            {activeWorkspace ? activeWorkspace.name : 'Select Workspace'}
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">
            {activeWorkspace ? `/${activeWorkspace.slug}` : 'No workspace'}
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            dropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Workspaces ({workspaces.length})
          </div>

          {/* List of workspaces */}
          <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
            {workspaces.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No workspaces available. Create your first workspace below!
              </div>
            ) : (
              workspaces.map((ws: Workspace) => {
                const isActive = activeWorkspace?.id === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspace(ws);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/80 text-blue-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Building2 className="w-3 h-3" />
                      </div>
                      <div className="truncate">
                        <div className="truncate">{ws.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          /{ws.slug}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {ws.current_user_role && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 ${getRoleBadgeStyle(
                            ws.current_user_role
                          )}`}
                        >
                          {getRoleIcon(ws.current_user_role)}
                          <span>{ws.current_user_role}</span>
                        </span>
                      )}
                      {isActive && <Check className="w-3.5 h-3.5 text-blue-600 ml-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 mt-1 border-t border-slate-100 space-y-1">
            {activeWorkspace && onOpenMembersModal && (
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenMembersModal();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <Users2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Manage Workspace Members</span>
              </button>
            )}

            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenCreateModal();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
