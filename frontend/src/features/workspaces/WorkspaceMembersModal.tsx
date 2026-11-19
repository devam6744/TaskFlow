import React, { useState, useEffect } from 'react';
import {
  Users2,
  X,
  Mail,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Eye,
  Trash2,
  Copy,
  Check,
  Loader2,
  Clock,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';

interface WorkspaceMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceMembersModal: React.FC<WorkspaceMembersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const {
    activeWorkspace,
    members,
    invites,
    fetchMembers,
    fetchInvites,
    inviteMember,
    removeMember,
    revokeInvite,
    updateMemberRole,
  } = useWorkspaceStore();
  const addToast = useToast((state) => state.addToast);

  const [activeTab, setActiveTab] = useState<'members' | 'invite' | 'pending'>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN' | 'VIEWER'>('MEMBER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInviteInfo, setCreatedInviteInfo] = useState<{
    email: string;
    token: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && activeWorkspace) {
      fetchMembers(activeWorkspace.slug);
      fetchInvites(activeWorkspace.slug);
      setCreatedInviteInfo(null);
      setCopied(false);
    }
  }, [isOpen, activeWorkspace]);

  if (!isOpen || !activeWorkspace) return null;

  const userRole = activeWorkspace.current_user_role;
  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const { invite, raw_token } = await inviteMember(
        activeWorkspace.slug,
        inviteEmail.trim(),
        inviteRole
      );

      const inviteUrl = `${window.location.origin}/join?token=${raw_token}`;
      setCreatedInviteInfo({
        email: invite.email,
        token: raw_token,
        url: inviteUrl,
      });

      addToast({
        type: 'success',
        title: 'Invitation Created',
        description: `Invite generated for ${invite.email}.`,
      });
      setInviteEmail('');
      fetchInvites(activeWorkspace.slug);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Invitation Failed',
        description: err.response?.data?.email?.[0] || err.message || 'Unable to create invite.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (createdInviteInfo) {
      navigator.clipboard.writeText(createdInviteInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({
        type: 'info',
        title: 'Copied',
        description: 'Invite URL copied to clipboard.',
      });
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      return;
    }
    try {
      await removeMember(activeWorkspace.slug, memberUserId);
      addToast({
        type: 'success',
        title: 'Member Removed',
        description: `${memberName} has been removed from this workspace.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        description: err.response?.data?.detail || 'Could not remove member.',
      });
    }
  };

  const handleRoleChange = async (memberUserId: string, newRole: string) => {
    try {
      await updateMemberRole(activeWorkspace.slug, memberUserId, newRole);
      addToast({
        type: 'success',
        title: 'Role Updated',
        description: `Member role updated to ${newRole}.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: err.response?.data?.detail || 'Could not change member role.',
      });
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(activeWorkspace.slug, inviteId);
      addToast({
        type: 'info',
        title: 'Invite Revoked',
        description: 'The invitation has been cancelled.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Revoke Failed',
        description: err.message || 'Could not revoke invitation.',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            <span>Owner</span>
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
            <ShieldAlert className="w-3 h-3 text-blue-600" />
            <span>Admin</span>
          </span>
        );
      case 'MEMBER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span>Member</span>
          </span>
        );
      case 'VIEWER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
            <Eye className="w-3 h-3 text-slate-500" />
            <span>Viewer</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{activeWorkspace.name}</span>
                <span className="text-xs font-mono font-normal text-slate-400">
                  /{activeWorkspace.slug}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage team roster, roles, and invitation links.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Active Members ({members.length})
          </button>

          {canManage && (
            <>
              <button
                onClick={() => setActiveTab('invite')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'invite'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Invite Member
              </button>

              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'pending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Pending Invites ({invites.filter((i) => i.status === 'PENDING').length})
              </button>
            </>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: MEMBERS LIST */}
          {activeTab === 'members' && (
            <div className="divide-y divide-slate-100">
              {members.map((member) => {
                const isCurrentUser = member.user.id === user?.id;
                return (
                  <div
                    key={member.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                        {member.user.display_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{member.user.display_name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-mono text-slate-400">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] font-mono">
                          {member.user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Role selection for Admins/Owners */}
                      {canManage && !isCurrentUser && member.role !== 'OWNER' ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                        >
                          <option value="ADMIN">Admin</option>
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        getRoleBadge(member.role)
                      )}

                      {/* Remove button */}
                      {canManage && !isCurrentUser && member.role !== 'OWNER' && (
                        <button
                          onClick={() =>
                            handleRemoveMember(member.user.id, member.user.display_name)
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: INVITE MEMBER */}
          {activeTab === 'invite' && (
            <div className="space-y-5">
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Team Member Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Initial Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  >
                    <option value="MEMBER">Member — Full access to projects, tasks, and sprints</option>
                    <option value="ADMIN">Admin — Can invite members and manage workspace settings</option>
                    <option value="VIEWER">Viewer — Read-only observation access</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !inviteEmail.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Invitation...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Send Workspace Invitation</span>
                    </>
                  )}
                </button>
              </form>

              {/* Display created invitation link */}
              {createdInviteInfo && (
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>Invitation Link Ready for {createdInviteInfo.email}</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80">
                    Share this unique single-use link with your team member. The link expires in 7 days.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      readOnly
                      value={createdInviteInfo.url}
                      className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono text-slate-700 select-all"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PENDING INVITES */}
          {activeTab === 'pending' && (
            <div className="space-y-3">
              {invites.filter((i) => i.status === 'PENDING').length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pending invitations at this time.
                </div>
              ) : (
                invites
                  .filter((i) => i.status === 'PENDING')
                  .map((invite) => (
                    <div
                      key={invite.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{invite.email}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Expires: {new Date(invite.expires_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-blue-600 font-semibold">{invite.role}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeInvite(invite.id)}
                        className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
