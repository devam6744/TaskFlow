import React from 'react';
import { Layers, ShieldCheck, Zap, Database, GitBranch, CheckCircle2 } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Left Column: Enterprise Branding & Interactive Preview (Desktop) */}
      <div className="hidden lg:flex lg:w-7/12 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60">
        {/* Ambient Gradient Glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              TaskFlow <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Enterprise</span>
            </div>
            <p className="text-xs text-slate-400">Scrum & Agile Lifecycle Management</p>
          </div>
        </div>

        {/* Center: Value Proposition & Interactive Mockup */}
        <div className="relative z-10 my-auto py-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Phase 1 & 2 Live — Custom Identity & Security Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Agile engineering, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
              elevated for modern teams.
            </span>
          </h1>

          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Experience high-performance sprint orchestration, multi-tenant workspace isolation, and bank-grade authentication with atomic database transactions.
          </p>

          {/* Interactive Sprint Ticket Mockup */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-2xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-300">Sprint 1 • Active Pipeline</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 8/8 Tests Passed
              </span>
            </div>

            {/* Ticket items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-400 text-[11px]">TF-101</span>
                  <span className="text-slate-200 font-medium">Dual-token JWT with HttpOnly rotation</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Done
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-400 text-[11px]">TF-102</span>
                  <span className="text-slate-200 font-medium">Supabase PostgreSQL 17 UUID architecture</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Done
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-400 text-[11px]">TF-103</span>
                  <span className="text-slate-200 font-medium">Multi-tenant Workspace & RBAC permissions</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Phase 3 Next
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Anti-Enumeration & Rate-Limiting</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Sub-100ms API Execution</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Database className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Supabase Managed Cloud DB</span>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Card Form */}
      <div className="w-full lg:w-5/12 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        {/* Mobile Header Logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">TaskFlow</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h2>
            <p className="text-slate-400 text-sm mt-2">{subtitle}</p>
          </div>

          {/* Form Container */}
          {children}
        </div>
      </div>
    </div>
  );
};
