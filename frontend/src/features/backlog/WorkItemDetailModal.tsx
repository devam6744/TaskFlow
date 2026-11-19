import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  CheckSquare,
  Bug,
  Zap,
  Trash2,
  Loader2,
  Check,
  MessageSquare,
  History,
  Paperclip,
  Send,
  Upload,
  Download,
  FileText,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { useBacklogStore } from '../../stores/backlogStore';
import type { WorkItem } from '../../stores/backlogStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';
import { useCollaborationStore } from '../../stores/collaborationStore';

interface WorkItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WorkItem | null;
  workspaceSlug: string;
  projectSlug: string;
}

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];

export const WorkItemDetailModal: React.FC<WorkItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  workspaceSlug,
  projectSlug,
}) => {
  const { user } = useAuthStore();
  const { updateWorkItem, deleteWorkItem } = useBacklogStore();
  const { members } = useWorkspaceStore();
  const addToast = useToast((state) => state.addToast);

  const {
    comments,
    attachments,
    activity,
    dependencies,
    loading: collabLoading,
    fetchCollaborationData,
    addComment,
    deleteComment,
    uploadAttachment,
    deleteAttachment,
    addDependency,
    removeDependency,
  } = useCollaborationStore();

  const [activeTab, setActiveTab] = useState<'comments' | 'activity' | 'attachments'>('comments');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('STORY');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [status, setStatus] = useState<string>('BACKLOG');
  const [storyPoints, setStoryPoints] = useState<number | null>(null);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Dependency input
  const [blockingItemNumber, setBlockingItemNumber] = useState('');
  const [isAddingDep, setIsAddingDep] = useState(false);

  // File upload input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load item and fetch collaboration data
  useEffect(() => {
    if (item && isOpen) {
      setTitle(item.title);
      setDescription(item.description || '');
      setType(item.type);
      setPriority(item.priority);
      setStatus(item.status);
      setStoryPoints(item.story_points);
      setAcceptanceCriteria(item.acceptance_criteria || '');
      setAssigneeId(item.assignee?.id || '');
      setDueDate(item.due_date || '');

      fetchCollaborationData(workspaceSlug, projectSlug, item.item_number);
    }
  }, [item, isOpen, workspaceSlug, projectSlug, fetchCollaborationData]);

  if (!isOpen || !item) return null;

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      await updateWorkItem(workspaceSlug, projectSlug, item.item_number, {
        title: title.trim(),
        description: description.trim(),
        type: type as any,
        priority: priority as any,
        status: status as any,
        story_points: storyPoints,
        acceptance_criteria: acceptanceCriteria.trim(),
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
      });

      addToast({
        type: 'success',
        title: 'Work Item Updated',
        description: `Saved changes to ${item.key_identifier}.`,
      });
      // Refresh collaboration data (may have triggered activity event)
      fetchCollaborationData(workspaceSlug, projectSlug, item.item_number);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Could not update work item.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${item.key_identifier}: "${item.title}"?`)) return;

    try {
      await deleteWorkItem(workspaceSlug, projectSlug, item.item_number);
      addToast({
        type: 'success',
        title: 'Work Item Deleted',
        description: `Removed ${item.key_identifier}.`,
      });
      onClose();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: err.message || 'Could not delete item.',
      });
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await addComment(workspaceSlug, projectSlug, item.item_number, commentText.trim());
      setCommentText('');
      addToast({
        type: 'success',
        title: 'Comment Added',
        description: 'Your comment has been posted to the discussion thread.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Comment Failed',
        description: err.response?.data?.body || err.message || 'Could not post comment.',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteComment(workspaceSlug, projectSlug, item.item_number, commentId);
      addToast({
        type: 'success',
        title: 'Comment Deleted',
        description: 'Comment has been removed.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        description: err.message || 'Could not delete comment.',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File Too Large',
        description: 'Attachments cannot exceed 10 MB.',
      });
      return;
    }

    setIsUploading(true);
    try {
      await uploadAttachment(workspaceSlug, projectSlug, item.item_number, file);
      addToast({
        type: 'success',
        title: 'File Uploaded',
        description: `Successfully attached ${file.name}.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Upload Failed',
        description: err.response?.data?.file || err.message || 'Could not upload attachment.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attId: string, filename: string) => {
    if (!window.confirm(`Delete file "${filename}"?`)) return;
    try {
      await deleteAttachment(workspaceSlug, projectSlug, item.item_number, attId);
      addToast({
        type: 'success',
        title: 'Attachment Deleted',
        description: `Removed ${filename}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        description: err.message || 'Could not delete attachment.',
      });
    }
  };

  const handleAddDependency = async () => {
    const num = parseInt(blockingItemNumber.trim(), 10);
    if (isNaN(num)) return;

    setIsAddingDep(true);
    try {
      await addDependency(workspaceSlug, projectSlug, item.item_number, num);
      setBlockingItemNumber('');
      addToast({
        type: 'success',
        title: 'Dependency Linked',
        description: `Item is now blocked by #${num}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Dependency Error',
        description: err.response?.data?.detail || err.message || 'Failed to add dependency.',
      });
    } finally {
      setIsAddingDep(false);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    try {
      await removeDependency(workspaceSlug, projectSlug, item.item_number, depId);
      addToast({
        type: 'success',
        title: 'Dependency Removed',
        description: 'Blocker has been unlinked.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Remove Failed',
        description: err.message || 'Could not remove dependency.',
      });
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'BUG':
        return <Bug className="w-3.5 h-3.5 text-rose-600" />;
      case 'TASK':
        return <CheckSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'IMPROVEMENT':
        return <Zap className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimeAgo = (isoString: string): string => {
    try {
      const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return isoString.split('T')[0];
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] border border-slate-200 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700 shadow-2xs">
              {getTypeIcon(type)}
              {item.key_identifier}
            </span>
            <span className="text-xs font-medium text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600">
              {item.sprint ? item.sprint.name : 'Product Backlog'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Delete work item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dual-Pane Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Pane: Work Item Details & Specifications */}
          <div className="w-full md:w-3/5 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-200 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                placeholder="Work item summary..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
                placeholder="Detailed context, user story, or implementation notes..."
              />
            </div>

            {/* Acceptance Criteria */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Acceptance Criteria (DoD)
              </label>
              <textarea
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
                placeholder="Given... When... Then... conditions required for story acceptance"
              />
            </div>

            {/* Core Attributes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 cursor-pointer"
                >
                  <option value="STORY">Story</option>
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="IMPROVEMENT">Improvement</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 cursor-pointer"
                >
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 cursor-pointer"
                >
                  <option value="BACKLOG">Backlog</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Assignee
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fibonacci Story Points */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Story Points (Fibonacci Effort)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStoryPoints(null)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    storyPoints === null
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  Unestimated
                </button>
                {FIBONACCI.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setStoryPoints(pt)}
                    className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                      storyPoints === pt
                        ? 'bg-blue-600 text-white shadow-xs scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Dependencies (Blocked By) Section */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Blocked By (Dependencies)
              </label>

              {/* List of current blockers */}
              {dependencies.length > 0 ? (
                <div className="space-y-1.5 mb-3">
                  {dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between px-3 py-1.5 bg-rose-50/70 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="font-mono font-bold">{dep.blocking_item.key_identifier}</span>
                        <span className="truncate">{dep.blocking_item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-mono">
                          {dep.blocking_item.status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDependency(dep.id)}
                        className="text-rose-400 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                        title="Remove blocker"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 mb-3 italic">
                  No blockers linked. This item has no dependencies.
                </div>
              )}

              {/* Add blocker inline input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={blockingItemNumber}
                  onChange={(e) => setBlockingItemNumber(e.target.value)}
                  placeholder="Item # that blocks this (e.g. 1)"
                  className="w-56 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={handleAddDependency}
                  disabled={!blockingItemNumber || isAddingDep}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Blocker</span>
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* Right Pane: Collaboration Hub (Comments, Activity, Attachments) */}
          <div className="w-full md:w-2/5 flex flex-col bg-slate-50/70 border-t md:border-t-0 overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center border-b border-slate-200 bg-white px-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-1.5 px-3 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'comments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comments</span>
                {comments.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    {comments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`flex items-center gap-1.5 px-3 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'activity'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Activity</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`flex items-center gap-1.5 px-3 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'attachments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Files</span>
                {attachments.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-bold">
                    {attachments.length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: Comments (Discussion Thread) */}
            {activeTab === 'comments' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {collabLoading && comments.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-xs text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Loading discussion...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      No comments yet. Start the conversation!
                    </div>
                  ) : (
                    comments.map((c) => {
                      const isAuthor = user?.id === c.author.id;
                      return (
                        <div
                          key={c.id}
                          className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs space-y-1.5 group"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                                {c.author.display_name.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-800">
                                {c.author.display_name}
                              </span>
                              <span className="text-slate-400">{formatTimeAgo(c.created_at)}</span>
                              {c.is_edited && (
                                <span className="text-[10px] text-slate-400 italic">(edited)</span>
                              )}
                            </div>
                            {isAuthor && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-7">
                            {c.body}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Comment Input */}
                <div className="p-3 bg-white border-t border-slate-200">
                  <div className="relative">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handlePostComment();
                        }
                      }}
                      rows={2}
                      placeholder="Add a comment... (Ctrl+Enter to post)"
                      className="w-full pl-3 pr-10 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 resize-none"
                    />
                    <button
                      type="button"
                      onClick={handlePostComment}
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="absolute right-2 bottom-2.5 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                      title="Post Comment"
                    >
                      {isSubmittingComment ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Activity Audit Trail */}
            {activeTab === 'activity' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {activity.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    <History className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No activity recorded for this item yet.
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 ml-3 space-y-4 py-1">
                    {activity.map((act) => {
                      const actorName = act.actor?.display_name || 'System';
                      return (
                        <div key={act.id} className="relative pl-5 text-xs text-slate-700">
                          {/* Dot indicator */}
                          <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-blue-600" />
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5">
                            <span className="font-semibold text-slate-700">{actorName}</span>
                            <span>·</span>
                            <span>{formatTimeAgo(act.created_at)}</span>
                          </div>

                          {act.event_type === 'STATUS_CHANGED' && (
                            <div className="text-xs text-slate-700">
                              Changed status from{' '}
                              <span className="font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-700">
                                {act.metadata.old_status}
                              </span>{' '}
                              ➔{' '}
                              <span className="font-mono px-1 py-0.2 rounded bg-blue-100 text-blue-700 font-bold">
                                {act.metadata.new_status}
                              </span>
                            </div>
                          )}

                          {act.event_type === 'COMMENT_ADDED' && (
                            <div className="text-xs text-slate-700">
                              Commented: <span className="italic text-slate-600">"{act.metadata.preview}"</span>
                            </div>
                          )}

                          {act.event_type === 'COMMENT_DELETED' && (
                            <div className="text-xs text-slate-500 italic">Deleted a comment</div>
                          )}

                          {act.event_type === 'ATTACHMENT_UPLOADED' && (
                            <div className="text-xs text-slate-700">
                              Attached file:{' '}
                              <span className="font-mono font-medium text-slate-900">
                                {act.metadata.filename}
                              </span>
                            </div>
                          )}

                          {act.event_type === 'ATTACHMENT_DELETED' && (
                            <div className="text-xs text-slate-500">
                              Removed file: <span className="font-mono">{act.metadata.filename}</span>
                            </div>
                          )}

                          {act.event_type === 'SPRINT_ASSIGNED' && (
                            <div className="text-xs text-slate-700">
                              Assigned to sprint:{' '}
                              <span className="font-bold text-blue-700">
                                {act.metadata.sprint_name}
                              </span>
                            </div>
                          )}

                          {act.event_type === 'DEPENDENCY_ADDED' && (
                            <div className="text-xs text-slate-700">
                              Added blocker dependency on{' '}
                              <span className="font-mono font-bold text-rose-700">
                                {act.metadata.blocking_key}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Attachments (File Zone) */}
            {activeTab === 'attachments' && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
                {/* Upload Trigger Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-white group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {isUploading ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-semibold py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading file...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 mx-auto text-slate-400 group-hover:text-blue-600 transition-colors" />
                      <div className="text-xs font-semibold text-slate-700">
                        Click or drag file to attach
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Images, PDF, Text, CSV, ZIP (Max 10 MB)
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachments List */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Uploaded Files ({attachments.length})
                  </div>

                  {attachments.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      No files attached yet.
                    </div>
                  ) : (
                    attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-slate-800 truncate">
                              {att.original_filename}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>{formatFileSize(att.size_bytes)}</span>
                              <span>·</span>
                              <span>{att.uploader.display_name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={att.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id, att.original_filename)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
