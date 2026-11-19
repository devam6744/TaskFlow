import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Building2, ArrowRight, Loader2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToast } from '../../stores/toastStore';

export const JoinWorkspacePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const { isAuthenticated, user } = useAuthStore();
  const { acceptInvite } = useWorkspaceStore();
  const addToast = useToast((state) => state.addToast);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ workspaceName: string; role: string } | null>(null);

  const handleAccept = async () => {
    if (!token) {
      setErrorMessage('Invitation token is missing from the URL.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await acceptInvite(token);
      setSuccessInfo({
        workspaceName: result.workspace.name,
        role: result.role,
      });
      addToast({
        type: 'success',
        title: 'Joined Workspace',
        description: `You are now a member of ${result.workspace.name}!`,
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || err.message || 'Failed to accept invitation. It may be expired or invalid.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Navbar */}
      <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight text-slate-900 text-base">TaskFlow</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl w-full max-w-md p-6 sm:p-8 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
            <Building2 className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Workspace Invitation
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              You have been invited to collaborate on TaskFlow.
            </p>
          </div>

          {/* If already joined successfully */}
          {successInfo ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold">Welcome to {successInfo.workspaceName}!</div>
              <p className="text-xs text-emerald-700">
                Assigned Role: <span className="font-semibold uppercase">{successInfo.role}</span>
              </p>
              <p className="text-[11px] text-emerald-600">Redirecting to your dashboard...</p>
            </div>
          ) : !isAuthenticated ? (
            /* User not signed in */
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left">
                Please sign in to your TaskFlow account or create one to accept this invitation.
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  to={`/login?redirect=/join?token=${token}`}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Sign In & Accept</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to={`/register?redirect=/join?token=${token}`}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                >
                  <span>Create New Account</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Authenticated user ready to accept */
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                Signed in as <strong className="text-slate-900">{user?.email}</strong>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                onClick={handleAccept}
                disabled={isSubmitting || !token}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Joining Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Accept & Enter Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 text-center text-xs text-slate-400">
        TaskFlow Enterprise Agile Management
      </footer>
    </div>
  );
};
