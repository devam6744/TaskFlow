import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 font-sans antialiased text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Left Column: Enterprise Branding & Product Context (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 lg:p-16 bg-white border-r border-slate-200">
        {/* Top Header Logo */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-slate-900">TaskFlow</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Enterprise
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Center: Value Proposition */}
        <div className="my-auto py-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Bank-Grade Multi-Tenant Platform</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
            Orchestrate sprints with precision and security.
          </h2>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-8">
            TaskFlow delivers full workspace isolation, automated agile state machines, and real-time sprint tracking built specifically for high-velocity software engineering teams.
          </p>

          <div className="space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-700">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Isolated multi-tenant organizational workspaces</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dual-token rotation with secure HttpOnly cookies</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Anti-enumeration defense and automatic rate-limiting</span>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="text-xs text-slate-400">
          TaskFlow Enterprise System • Crafted with clean architecture
        </div>
      </div>

      {/* Right Column: Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        {/* Mobile Header Logo */}
        <div className="lg:hidden flex items-center justify-between w-full max-w-md mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-slate-900">TaskFlow</span>
          </Link>
          <Link to="/" className="text-xs font-semibold text-blue-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="text-slate-500 text-sm mt-1.5">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
