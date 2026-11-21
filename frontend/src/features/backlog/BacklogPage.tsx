import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Layers,
  BookOpen,
  CheckSquare,
  Bug,
  Zap,
  Flame,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  User,
  Trash2,
  Lock,
  Globe,
  CheckCircle2,
  Hash,
  ClipboardList,
  X,
  Loader2,
  Play,
  Kanban,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useBacklogStore, type WorkItem } from '../../stores/backlogStore';
import { useSprintStore, type Sprint } from '../../stores/sprintStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToast } from '../../stores/toastStore';
import { CreateProjectModal } from '../projects/CreateProjectModal';
import { WorkItemDetailModal } from './WorkItemDetailModal';
import { CreateSprintModal } from '../sprints/CreateSprintModal';
import { StartSprintModal } from '../sprints/StartSprintModal';

const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

interface BacklogPageProps {
  onNavigateToBoard?: () => void;
}

export const BacklogPage: React.FC<BacklogPageProps> = ({ onNavigateToBoard }) => {
  const { activeWorkspace } = useWorkspaceStore();
  const { projects, activeProject, fetchProjects, setActiveProject } = useProjectStore();
  const {
    workItems,
    fetchBacklog,
    createWorkItem,
    reorderWorkItem,
    deleteWorkItem,
    isLoading: isBacklogLoading,
  } = useBacklogStore();
  const {
    sprints,
    fetchSprints,
    addItemsToSprint,
  } = useSprintStore();
  const addToast = useToast((state) => state.addToast);

  // Bulk Selection & Assignment State
  const [selectedItemNumbers, setSelectedItemNumbers] = useState<number[]>([]);
  const [bulkSprintId, setBulkSprintId] = useState<string>('');
  const [isBulkAssigning, setIsBulkAssigning] = useState<boolean>(false);

  // Modals state
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [startSprintTarget, setStartSprintTarget] = useState<Sprint | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [showDoDBanner, setShowDoDBanner] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Quick Create Inline State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<'STORY' | 'TASK' | 'BUG' | 'IMPROVEMENT'>('STORY');
  const [quickPoints, setQuickPoints] = useState<number | null>(null);
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Fetch projects when active workspace changes
  useEffect(() => {
    if (activeWorkspace) {
      fetchProjects(activeWorkspace.slug);
    }
  }, [activeWorkspace, fetchProjects]);

  // Fetch backlog and sprints when active project changes
  useEffect(() => {
    if (activeWorkspace && activeProject) {
      fetchBacklog(activeWorkspace.slug, activeProject.slug);
      fetchSprints(activeWorkspace.slug, activeProject.slug);
    }
  }, [activeWorkspace, activeProject, fetchBacklog, fetchSprints]);

  // Handle Quick Create Item
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || !activeWorkspace || !activeProject) return;

    setIsSubmittingQuick(true);
    try {
      await createWorkItem(activeWorkspace.slug, activeProject.slug, {
        title: quickTitle.trim(),
        type: quickType,
        story_points: quickPoints,
        priority: 'MEDIUM',
      });
      setQuickTitle('');
      setQuickPoints(null);
      addToast({
        type: 'success',
        title: 'Work Item Added',
        description: 'Item placed in product backlog.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to add item',
        description: err.message || 'Please check your inputs.',
      });
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // Assign item to sprint
  const handleAssignToSprint = async (itemNumber: number, sprintId: string) => {
    if (!activeWorkspace || !activeProject) return;
    try {
      await addItemsToSprint(activeWorkspace.slug, activeProject.slug, sprintId, [itemNumber]);
      const targetSprint = sprints.find((s) => s.id === sprintId);
      addToast({
        type: 'success',
        title: 'Assigned to Sprint',
        description: `Item committed to "${targetSprint?.name || 'Sprint'}".`,
      });
      await fetchBacklog(activeWorkspace.slug, activeProject.slug);
      if (targetSprint?.status === 'ACTIVE' && onNavigateToBoard) {
        onNavigateToBoard();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Assignment Failed',
        description: err.message || 'Could not add item to sprint.',
      });
    }
  };

  // Bulk Selection & Assignment Handlers
  const toggleSelectItem = (itemNumber: number) => {
    setSelectedItemNumbers((prev) =>
      prev.includes(itemNumber) ? prev.filter((n) => n !== itemNumber) : [...prev, itemNumber]
    );
  };

  const handleSelectAll = () => {
    if (selectedItemNumbers.length === filteredItems.length) {
      setSelectedItemNumbers([]);
    } else {
      setSelectedItemNumbers(filteredItems.map((item) => item.item_number));
    }
  };

  const handleBulkAssignToSprint = async () => {
    if (!activeWorkspace || !activeProject || !bulkSprintId || selectedItemNumbers.length === 0) return;
    setIsBulkAssigning(true);
    try {
      await addItemsToSprint(activeWorkspace.slug, activeProject.slug, bulkSprintId, selectedItemNumbers);
      const targetSprint = sprints.find((s) => s.id === bulkSprintId);
      addToast({
        type: 'success',
        title: 'Bulk Assignment Complete',
        description: `${selectedItemNumbers.length} items moved to "${targetSprint?.name || 'Sprint'}".`,
      });
      setSelectedItemNumbers([]);
      setBulkSprintId('');
      await fetchBacklog(activeWorkspace.slug, activeProject.slug);
      if (targetSprint?.status === 'ACTIVE' && onNavigateToBoard) {
        onNavigateToBoard();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Bulk Assignment Failed',
        description: err.message || 'Could not move items to sprint.',
      });
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Reorder Item (Move Up or Down)
  const handleMove = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!activeWorkspace || !activeProject) return;

    const targetItem = filteredItems[index];
    if (!targetItem) return;

    let prevItemId: string | null = null;
    let nextItemId: string | null = null;

    if (direction === 'UP') {
      if (index === 0) return; // already at top
      const itemAbove = filteredItems[index - 1];
      const itemAboveThat = index > 1 ? filteredItems[index - 2] : null;
      nextItemId = itemAbove.id;
      prevItemId = itemAboveThat ? itemAboveThat.id : null;
    } else {
      if (index >= filteredItems.length - 1) return; // already at bottom
      const itemBelow = filteredItems[index + 1];
      const itemBelowThat = index < filteredItems.length - 2 ? filteredItems[index + 2] : null;
      prevItemId = itemBelow.id;
      nextItemId = itemBelowThat ? itemBelowThat.id : null;
    }

    try {
      await reorderWorkItem(
        activeWorkspace.slug,
        activeProject.slug,
        targetItem.item_number,
        prevItemId,
        nextItemId
      );
      addToast({
        type: 'info',
        title: 'Priority Reordered',
        description: `Position of ${targetItem.key_identifier} updated.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Reorder failed',
        description: err.message || 'Could not update backlog order.',
      });
    }
  };

  // Delete Item
  const handleDeleteItem = async (e: React.MouseEvent, item: WorkItem) => {
    e.stopPropagation();
    if (!activeWorkspace || !activeProject) return;
    if (!confirm(`Delete work item "${item.key_identifier}: ${item.title}"?`)) return;

    try {
      await deleteWorkItem(activeWorkspace.slug, activeProject.slug, item.item_number);
      addToast({
        type: 'success',
        title: 'Item Deleted',
        description: `${item.key_identifier} removed from backlog.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: err.message || 'Failed to delete work item.',
      });
    }
  };

  // Filter items
  const filteredItems = workItems.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchKey = item.key_identifier.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchKey && !matchDesc) return false;
    }
    if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
    if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  // KPI calculations
  const totalPoints = workItems.reduce((acc, curr) => acc + (curr.story_points || 0), 0);
  const doneItems = workItems.filter((item) => item.status === 'DONE').length;
  const estimatedCount = workItems.filter((item) => item.story_points !== null).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUG':
        return <Bug className="w-3.5 h-3.5 text-rose-600" />;
      case 'TASK':
        return <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />;
      case 'IMPROVEMENT':
        return <Zap className="w-3.5 h-3.5 text-emerald-600" />;
      case 'STORY':
      default:
        return <BookOpen className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600" />
            <span>Urgent</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>High</span>
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
            <ArrowDown className="w-3 h-3 text-slate-400" />
            <span>Low</span>
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
            <ArrowUp className="w-3 h-3 text-sky-600" />
            <span>Medium</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Done
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            In Progress
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            In Review
          </span>
        );
      case 'TODO':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            To Do
          </span>
        );
      case 'BACKLOG':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Backlog
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Project Selector & Header Toolbar */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Project Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Agile Project
                </div>
                <div className="flex items-center gap-2">
                  {projects.length > 0 ? (
                    <select
                      value={activeProject?.id || ''}
                      onChange={(e) => {
                        const selected = projects.find((p) => p.id === e.target.value);
                        if (selected) setActiveProject(selected);
                      }}
                      className="text-base font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer pr-6 tracking-tight"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.key}]
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">
                      No Projects Available
                    </span>
                  )}
                </div>
              </div>
            </div>

            {activeProject && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {activeProject.key}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {activeProject.visibility === 'PRIVATE' ? (
                    <>
                      <Lock className="w-2.5 h-2.5" /> Private
                    </>
                  ) : (
                    <>
                      <Globe className="w-2.5 h-2.5" /> Workspace
                    </>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons: New Project & DoD Toggle */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {activeProject?.definition_of_done && (
              <button
                type="button"
                onClick={() => setShowDoDBanner(!showDoDBanner)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showDoDBanner
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 text-blue-600" />
                <span>Definition of Done</span>
              </button>
            )}

            {activeProject && (
              <button
                type="button"
                onClick={() => setCreateSprintOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-blue-600" />
                <span>Create Sprint</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setCreateProjectOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Project DoD Collapsible Card */}
        {showDoDBanner && activeProject?.definition_of_done && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Project Definition of Done (DoD)
              </span>
              <button
                onClick={() => setShowDoDBanner(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-blue-800 leading-relaxed font-normal">
              {activeProject.definition_of_done}
            </p>
          </div>
        )}

        {/* Agile Backlog KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Total Work Items
            </div>
            <div className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              {workItems.length}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Story Points Total
            </div>
            <div className="text-lg font-bold text-blue-600 tracking-tight mt-0.5 flex items-baseline gap-1">
              <span>{totalPoints}</span>
              <span className="text-[11px] font-normal text-slate-500">pts</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Estimated Coverage
            </div>
            <div className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              {workItems.length > 0
                ? `${Math.round((estimatedCount / workItems.length) * 100)}%`
                : '0%'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Completed (Done)
            </div>
            <div className="text-lg font-bold text-emerald-600 tracking-tight mt-0.5">
              {doneItems} / {workItems.length}
            </div>
          </div>
        </div>
      </div>

      {/* When no project exists */}
      {projects.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              No Projects in this Workspace
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
              Projects organize your product backlogs, user stories, and sequential keys (e.g. TF-1,
              TF-2). Create your first project to start sprint planning.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateProjectOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <>
          {/* Quick Create Inline Form */}
          <form
            onSubmit={handleQuickCreate}
            className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            {/* Type selector */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
              {getTypeIcon(quickType)}
              <select
                value={quickType}
                onChange={(e) => setQuickType(e.target.value as any)}
                className="text-xs font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
              >
                <option value="STORY">Story</option>
                <option value="TASK">Task</option>
                <option value="BUG">Bug</option>
                <option value="IMPROVEMENT">Improvement</option>
              </select>
            </div>

            {/* Title Input */}
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="What needs to be done? Press Enter to save..."
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
            />

            {/* Story points pill selector */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pts:</span>
              <select
                value={quickPoints ?? ''}
                onChange={(e) =>
                  setQuickPoints(e.target.value === '' ? null : Number(e.target.value))
                }
                className="text-xs font-semibold text-slate-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
              >
                <option value="">--</option>
                {FIBONACCI_POINTS.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmittingQuick || !quickTitle.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              {isSubmittingQuick ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>Add Item</span>
            </button>
          </form>

          {/* Filters Bar */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search backlog by title or key (e.g. TF-1)..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Filters:</span>
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="STORY">Stories</option>
                <option value="TASK">Tasks</option>
                <option value="BUG">Bugs</option>
                <option value="IMPROVEMENT">Improvements</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>

              {(searchQuery ||
                typeFilter !== 'ALL' ||
                priorityFilter !== 'ALL' ||
                statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('ALL');
                    setPriorityFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-semibold transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Sprints Planning Section */}
          {sprints.filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED').length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sprint Planning & Iterations
                </span>
              </div>

              <div className="space-y-3">
                {sprints
                  .filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED')
                  .map((sprint) => (
                    <div
                      key={sprint.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm text-slate-900 tracking-tight">
                            {sprint.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              sprint.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {sprint.status}
                          </span>
                          {sprint.sprint_goal && (
                            <span className="text-xs text-slate-500 italic truncate max-w-sm hidden sm:inline">
                              "{sprint.sprint_goal}"
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs font-semibold text-slate-500">
                            <span>{sprint.total_items} items</span>
                            <span className="mx-1">•</span>
                            <span className="text-blue-600 font-bold">
                              {sprint.total_story_points} pts
                            </span>
                          </div>

                          {sprint.status === 'PLANNING' && (
                            <button
                              type="button"
                              onClick={() => setStartSprintTarget(sprint)}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Start Sprint</span>
                            </button>
                          )}

                          {sprint.status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={onNavigateToBoard}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Kanban className="w-3 h-3 text-white" />
                              <span>Open Sprint Board</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {sprint.sprint_goal && (
                        <div className="text-xs text-slate-600 sm:hidden italic">
                          "{sprint.sprint_goal}"
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Backlog Items List Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={filteredItems.length > 0 && selectedItemNumbers.length === filteredItems.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  title="Select all items"
                  aria-label="Select all items"
                />
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Product Backlog Order (LexoRank Priority)
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {filteredItems.length} items
              </span>
            </div>

            {/* Bulk Action Bar (Visible when items selected) */}
            {selectedItemNumbers.length > 0 && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-blue-900 font-semibold">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>{selectedItemNumbers.length} work items selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkSprintId}
                    onChange={(e) => setBulkSprintId(e.target.value)}
                    className="text-xs font-semibold text-slate-700 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-600/20 cursor-pointer"
                  >
                    <option value="">Move All to Sprint...</option>
                    {sprints
                      .filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED')
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!bulkSprintId || isBulkAssigning}
                    onClick={handleBulkAssignToSprint}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                  >
                    {isBulkAssigning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-white" />
                    )}
                    <span>Move {selectedItemNumbers.length} Items</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItemNumbers([])}
                    className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-blue-100/50 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {isBacklogLoading && workItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading backlog items...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700">No work items found</div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  {workItems.length === 0
                    ? 'Start by adding your first user story or task using the input above.'
                    : 'No items match your active filters. Try resetting the search or filter.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="p-3.5 sm:px-4 sm:py-3 hover:bg-slate-50/80 transition-colors flex items-center gap-2 sm:gap-3 group cursor-pointer"
                  >
                    {/* Item Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedItemNumbers.includes(item.item_number)}
                      onChange={() => toggleSelectItem(item.item_number)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                      aria-label={`Select ${item.key_identifier}`}
                    />

                    {/* Reorder Grip & Arrows (Mobile + Touch Friendly) */}
                    <div
                      className="flex items-center gap-0.5 text-slate-300 group-hover:text-slate-500 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'UP')}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-500 cursor-pointer"
                        title="Move Up"
                        aria-label="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === filteredItems.length - 1}
                        onClick={() => handleMove(index, 'DOWN')}
                        className="p-1 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-500 cursor-pointer"
                        title="Move Down"
                        aria-label="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Issue Type Icon */}
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 shrink-0">
                      {getTypeIcon(item.type)}
                    </div>

                    {/* Key identifier */}
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {item.key_identifier}
                    </span>

                    {/* Title */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold text-slate-900 truncate hover:text-blue-600 transition-colors ${
                            item.status === 'DONE' ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.acceptance_criteria && (
                          <span
                            title="Acceptance Criteria Defined"
                            className="shrink-0 text-emerald-600"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Story Points Pill */}
                    <div className="shrink-0">
                      {item.story_points !== null ? (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          <Hash className="w-2.5 h-2.5 text-blue-500" />
                          {item.story_points}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded border border-dashed border-slate-200">
                          -- pts
                        </span>
                      )}
                    </div>

                    {/* Priority Badge */}
                    <div className="hidden sm:block shrink-0">
                      {getPriorityBadge(item.priority)}
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">{getStatusBadge(item.status)}</div>

                    {/* Assignee Avatar */}
                    <div className="shrink-0">
                      {item.assignee ? (
                        <div
                          className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center"
                          title={`Assigned to ${item.assignee.display_name}`}
                        >
                          {item.assignee.display_name.substring(0, 2).toUpperCase()}
                        </div>
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"
                          title="Unassigned"
                        >
                          <User className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Move to Sprint Selector */}
                    {sprints.filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED').length > 0 && (
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignToSprint(item.item_number, e.target.value);
                            }
                          }}
                          className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer hover:border-slate-300"
                        >
                          <option value="">Move to Sprint...</option>
                          {sprints
                            .filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED')
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.status})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Delete action button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(e, item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Project Modal */}
      {activeWorkspace && (
        <CreateProjectModal
          isOpen={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          workspaceSlug={activeWorkspace.slug}
        />
      )}

      {/* Create Sprint Modal */}
      {activeWorkspace && activeProject && (
        <CreateSprintModal
          isOpen={createSprintOpen}
          onClose={() => setCreateSprintOpen(false)}
          workspaceSlug={activeWorkspace.slug}
          projectSlug={activeProject.slug}
        />
      )}

      {/* Start Sprint Modal */}
      {activeWorkspace && activeProject && startSprintTarget && (
        <StartSprintModal
          isOpen={!!startSprintTarget}
          onClose={() => setStartSprintTarget(null)}
          sprint={startSprintTarget}
          workspaceSlug={activeWorkspace.slug}
          projectSlug={activeProject.slug}
          onSprintStarted={() => {
            fetchSprints(activeWorkspace.slug, activeProject.slug);
            fetchBacklog(activeWorkspace.slug, activeProject.slug);
            if (onNavigateToBoard) onNavigateToBoard();
          }}
        />
      )}

      {/* Work Item Detail & Edit Modal */}
      {activeWorkspace && activeProject && (
        <WorkItemDetailModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          workspaceSlug={activeWorkspace.slug}
          projectSlug={activeProject.slug}
        />
      )}
    </div>
  );
};
