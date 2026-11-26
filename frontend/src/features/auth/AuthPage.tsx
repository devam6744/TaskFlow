import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../stores/toastStore';
import { AuthLayout } from './AuthLayout';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const addToast = useToast((state) => state.addToast);

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(
    location.pathname === '/register' ? 'register' : initialMode
  );
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (location.pathname === '/register') {
      setMode('register');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live password strength calculation (for Register mode)
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Empty', color: 'bg-slate-200', width: '0%' };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500', width: '25%' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500', width: '50%' };
      case 3:
        return { score: 3, label: 'Strong', color: 'bg-blue-600', width: '75%' };
      case 4:
        return { score: 4, label: 'Enterprise Grade', color: 'bg-emerald-600', width: '100%' };
      default:
        return { score: 0, label: 'Too Short', color: 'bg-rose-500', width: '15%' };
    }
  }, [password]);

  const handleTabSwitch = (newMode: 'login' | 'register' | 'forgot') => {
    setError(null);
    setForgotSent(false);
    setMode(newMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Please enter your registered email address.');
        return;
      }
      setLoading(true);
      try {
        await apiClient.post('/auth/password-reset/', { email: email.trim().toLowerCase() });
        setForgotSent(true);
        addToast({
          type: 'success',
          title: 'Reset Link Dispatched',
          description: 'If registered, password reset instructions were sent to your inbox.',
        });
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to dispatch reset link. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register' && password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const response = await apiClient.post('/auth/login/', {
          email: email.trim().toLowerCase(),
          password,
        });

        const { user, access, refresh } = response.data;
        setAuth(user, access, refresh);
        addToast({
          type: 'success',
          title: 'Welcome Back',
          description: `Logged in as ${user.display_name}`,
        });
        navigate('/dashboard');
      } else {
        const response = await apiClient.post('/auth/register/', {
          display_name: displayName.trim(),
          email: email.trim().toLowerCase(),
          password,
        });

        const { user, access, refresh } = response.data;
        setAuth(user, access, refresh);
        addToast({
          type: 'success',
          title: 'Account Created',
          description: `Welcome to TaskFlow, ${user.display_name}!`,
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Rate limit exceeded: Please wait 30 seconds before retrying.');
      } else if (err.response?.data?.email) {
        setError(Array.isArray(err.response.data.email) ? err.response.data.email[0] : err.response.data.email);
      } else if (err.response?.data?.password) {
        setError(Array.isArray(err.response.data.password) ? err.response.data.password[0] : err.response.data.password);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Authentication failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('dev@taskflow.dev');
    setPassword('TaskFlow@2026');
  };

  return (
    <AuthLayout>
      {/* Segmented Tab Switcher (SPA In-Place Navigation) */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
        <button
          type="button"
          onClick={() => handleTabSwitch('login')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mode === 'login'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch('register')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mode === 'register'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Create Account
        </button>
      </div>

      <div className="mb-5 text-center">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {mode === 'login'
            ? 'Sign in to TaskFlow'
            : mode === 'register'
            ? 'Create your workspace account'
            : 'Reset your password'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {mode === 'login'
            ? 'Enter your credentials to access your agile sprint board'
            : mode === 'register'
            ? 'Join TaskFlow to orchestrate agile sprints and backlogs'
            : "Enter your registered email and we'll dispatch a secure recovery link"}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {mode === 'forgot' ? (
        forgotSent ? (
          <div className="space-y-4 py-2 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Check Your Inbox</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                If an account exists for <strong className="text-slate-800">{email}</strong>, password reset instructions have been sent via Gmail SMTP.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Account Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="devam@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => handleTabSwitch('login')}
                className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </button>
            </div>
          </form>
        )
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name (Register mode only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Devam Mandli"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="devam@company.com"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              {mode === 'login' && (
                <span
                  onClick={() => handleTabSwitch('forgot')}
                  className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Forgot password?
                </span>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••••••'}
                className="w-full pl-9 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Meter (Register mode) */}
            {mode === 'register' && password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Strength:</span>
                  <span className={`font-semibold ${
                    passwordStrength.score >= 3 ? 'text-emerald-600' : passwordStrength.score === 2 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} transition-all duration-300 rounded-full`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to TaskFlow' : 'Create TaskFlow Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Demo Credentials button in login mode */}
          {mode === 'login' && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDemoFill}
                className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Fill Demo Credentials (`dev@taskflow.dev`)</span>
              </button>
            </div>
          )}
        </form>
      )}
    </AuthLayout>
  );
};
