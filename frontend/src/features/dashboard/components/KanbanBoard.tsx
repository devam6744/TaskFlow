import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Kanban as KanbanIcon,
  Clock,
  Target,
  Flame,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  BookOpen,
  CheckSquare,
  Bug,
  Zap,
  Search,
  Plus,
} from 'lucide-react';
import { useSprintStore } from '../../../stores/sprintStore';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useProjectStore } from '../../../stores/projectStore';
import { useAuthStore } from '../../../stores/authStore';
import { useToast } from '../../../stores/toastStore';
import type { WorkItem } from '../../../stores/backlogStore';
import { CompleteSprintModal } from '../../sprints/CompleteSprintModal';
import { CreateSprintModal } from '../../sprints/CreateSprintModal';
import { WorkItemDetailModal } from '../../backlog/WorkItemDetailModal';

export const KanbanBoard: React.FC = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const { activeProject } = useProjectStore();
  const { user } = useAuthStore();
  const {
    boardData,
    activeSprint,
    fetchBoard,
    transitionWorkItemStatus,
  } = useSprintStore();
  const addToast = useToast((state) => state.addToast);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [draggedItemNumber, setDraggedItemNumber] = useState<number | null>(null);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch board data when workspace or active project changes
  useEffect(() => {
    if (activeWorkspace && activeProject) {
      fetchBoard(activeWorkspace.slug, activeProject.slug);
    }
  }, [activeWorkspace, activeProject, fetchBoard]);

  const handleMove = async (item: WorkItem, targetColumn: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') => {
    if (!activeWorkspace || !activeProject) return;
    if (item.status === targetColumn) return;

    try {
      await transitionWorkItemStatus(
        activeWorkspace.slug,
        activeProject.slug,
        item.item_number,
        targetColumn
      );
      addToast({
        type: 'info',
        title: `Moved ${item.key_identifier}`,
        description: `Shifted to ${targetColumn.replace('_', ' ')}`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Move Failed',
        description: err.message || 'Could not move card',
      });
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumn: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') => {
    e.preventDefault();
    if (draggedItemNumber === null || !boardData) return;

    // Find the item across all columns
    let foundItem: WorkItem | null = null;
    for (const col of Object.values(boardData.columns)) {
      const match = col.find((i) => i.item_number === draggedItemNumber);
      if (match) {
        foundItem = match;
        break;
      }
    }

    if (foundItem) {
      handleMove(foundItem, targetColumn);
    }
    setDraggedItemNumber(null);
  };

  const filterCards = (items: WorkItem[] = []) => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchKey = item.key_identifier.toLowerCase().includes(q);
        if (!matchTitle && !matchKey) return false;
      }
      if (onlyMyIssues && user) {
        if (item.assignee?.id !== user.id) return false;
      }
      return true;
    });
  };

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
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
            <Flame className="w-2.5 h-2.5 text-rose-600" /> Urgent
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            <AlertCircle className="w-2.5 h-2.5 text-amber-600" /> High
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
            <ArrowDown className="w-2.5 h-2.5 text-slate-400" /> Low
          </span>
        );
      case 'MEDIUM':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
            <ArrowUp className="w-2.5 h-2.5 text-sky-600" /> Medium
          </span>
        );
    }
  };

  const totalPoints = activeSprint?.planned_story_points || 0;
  const donePoints = activeSprint?.done_story_points || 0;
  const progressPercent =
    totalPoints > 0 ? Math.min(100, Math.round((donePoints / totalPoints) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header: Active Sprint Overview or Empty State Banner */}
      {activeSprint ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Sprint Goal & Name */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Active Sprint
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {activeSprint.name}
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{boardData?.days_remaining ?? 0} days left</span>
                </span>
              </div>

              {activeSprint.sprint_goal && (
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 pt-0.5">
                  <Target className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="italic">"{activeSprint.sprint_goal}"</span>
                </div>
              )}
            </div>

            {/* Right: Progress bar & Complete Sprint Button */}
            <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
              {/* Velocity Points Progress */}
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Story Points Progress
                </div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
                  <span>{donePoints}</span>
                  <span className="text-slate-400">/</span>
                  <span>{totalPoints} pts</span>
                  <span className="text-blue-600 font-normal">({progressPercent}%)</span>
                </div>
                <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Complete Sprint Action */}
              <button
                type="button"
                onClick={() => setCompleteModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete Sprint</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <KanbanIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">No Active Sprint</h4>
                <p className="text-xs text-slate-500">
                  Create or activate a planned sprint to start running your Kanban board.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCreateSprintOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Sprint</span>
          </button>
        </div>
      )}

      {/* Toolbar: Search and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search board cards..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyMyIssues(!onlyMyIssues)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              onlyMyIssues
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Only My Issues
          </button>
        </div>
      </div>

      {/* 4 Swimlane Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* COLUMN 1: TO DO */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'TODO')}
          className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 flex flex-col min-h-[500px]"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                To Do
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              {filterCards(boardData?.columns.TODO).length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {filterCards(boardData?.columns.TODO).map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedItemNumber(item.item_number)}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-2 cursor-grab active:cursor-grabbing group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getTypeIcon(item.type)}
                    <span className="font-mono text-[11px] font-bold text-slate-600">
                      {item.key_identifier}
                    </span>
                  </div>
                  {getPriorityBadge(item.priority)}
                </div>

                <div
                  onClick={() => {
                    setSelectedWorkItem(item);
                    setDetailModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-900 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Click to view details, discussion & files"
                >
                  {item.title}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1 text-blue-600 font-bold font-mono">
                    <span>{item.story_points ?? '--'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </div>

                  {/* Touch Column Transition Quick Action */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(item, 'IN_PROGRESS')}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 cursor-pointer"
                      title="Move to In Progress"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: IN PROGRESS */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'IN_PROGRESS')}
          className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 flex flex-col min-h-[500px]"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                In Progress
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              {filterCards(boardData?.columns.IN_PROGRESS).length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {filterCards(boardData?.columns.IN_PROGRESS).map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedItemNumber(item.item_number)}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-2 cursor-grab active:cursor-grabbing group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getTypeIcon(item.type)}
                    <span className="font-mono text-[11px] font-bold text-slate-600">
                      {item.key_identifier}
                    </span>
                  </div>
                  {getPriorityBadge(item.priority)}
                </div>

                <div
                  onClick={() => {
                    setSelectedWorkItem(item);
                    setDetailModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-900 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Click to view details, discussion & files"
                >
                  {item.title}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1 text-purple-600 font-bold font-mono">
                    <span>{item.story_points ?? '--'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(item, 'TODO')}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Move back to To Do"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(item, 'IN_REVIEW')}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 cursor-pointer"
                      title="Move to In Review"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: IN REVIEW */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'IN_REVIEW')}
          className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 flex flex-col min-h-[500px]"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                In Review
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              {filterCards(boardData?.columns.IN_REVIEW).length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {filterCards(boardData?.columns.IN_REVIEW).map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedItemNumber(item.item_number)}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-2 cursor-grab active:cursor-grabbing group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getTypeIcon(item.type)}
                    <span className="font-mono text-[11px] font-bold text-slate-600">
                      {item.key_identifier}
                    </span>
                  </div>
                  {getPriorityBadge(item.priority)}
                </div>

                <div
                  onClick={() => {
                    setSelectedWorkItem(item);
                    setDetailModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-900 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Click to view details, discussion & files"
                >
                  {item.title}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1 text-amber-600 font-bold font-mono">
                    <span>{item.story_points ?? '--'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(item, 'IN_PROGRESS')}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Move back to In Progress"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(item, 'DONE')}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-600 cursor-pointer"
                      title="Mark as Done"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 4: DONE */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'DONE')}
          className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 flex flex-col min-h-[500px]"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Done
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              {filterCards(boardData?.columns.DONE).length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {filterCards(boardData?.columns.DONE).map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedItemNumber(item.item_number)}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-2 cursor-grab active:cursor-grabbing group opacity-90 hover:opacity-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getTypeIcon(item.type)}
                    <span className="font-mono text-[11px] font-bold text-slate-400 line-through">
                      {item.key_identifier}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Done
                  </span>
                </div>

                <div
                  onClick={() => {
                    setSelectedWorkItem(item);
                    setDetailModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-500 line-through line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Click to view details, discussion & files"
                >
                  {item.title}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1 text-emerald-600 font-bold font-mono">
                    <span>{item.story_points ?? '--'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">pts</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMove(item, 'IN_REVIEW')}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Move back to In Review"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Complete Sprint Modal */}
      {activeWorkspace && activeProject && activeSprint && (
        <CompleteSprintModal
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
          sprint={activeSprint}
          workspaceSlug={activeWorkspace.slug}
          projectSlug={activeProject.slug}
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

      {/* Work Item Detail & Collaboration Modal */}
      {selectedWorkItem && activeWorkspace && activeProject && (
        <WorkItemDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedWorkItem(null);
            fetchBoard(activeWorkspace.slug, activeProject.slug);
          }}
          item={selectedWorkItem}
          workspaceSlug={activeWorkspace.slug}
          projectSlug={activeProject.slug}
        />
      )}
    </div>
  );
};
