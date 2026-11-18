import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Kanban, Layers, ChevronRight } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Product Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-6 shadow-sm">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Next-Generation Agile & Scrum Management</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
          The agile execution platform for{' '}
          <span className="text-blue-600">high-velocity teams.</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Plan sprints with precision, orchestrate hierarchical backlogs, track team velocity, and align cross-functional engineering workflows with bank-grade multi-tenancy.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all cursor-pointer"
          >
            <span>Start Free Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer shadow-sm"
          >
            <span>Sign In to Existing</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>

        {/* Value Highlights */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Multi-Tenant Workspaces</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Role-Based Access Control</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Automated Sprint Lifecycle</span>
          </div>
        </div>

        {/* Interactive Sprint Board Preview Mockup (Clean Light Theme) */}
        <div className="mt-14 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden text-left">
            {/* Window Top Bar */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="ml-2 text-xs font-semibold text-slate-600 hidden sm:inline">
                  TaskFlow Workspace / Core Engineering / Active Sprint 1
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                <Kanban className="w-3.5 h-3.5" />
                <span>Sprint 1 • 68% Complete</span>
              </div>
            </div>

            {/* Board Columns (Responsive: scrollable on mobile, 4 columns on desktop) */}
            <div className="p-4 sm:p-6 bg-slate-50/50 overflow-x-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[280px]">
                {/* Col 1: To Do */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">To Do</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">2</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-400 transition-colors">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-mono font-semibold text-blue-600">TF-105</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">High</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">Sprint burndown charts and velocity metrics</p>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">8 pts</span>
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center">DM</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 2: In Progress */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">In Progress</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">1</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/20">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-mono font-semibold text-blue-600">TF-104</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Urgent</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">Workspace multi-tenancy isolation layer</p>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">5 pts</span>
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">RK</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 3: In Review */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700">In Review</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">1</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-mono font-semibold text-blue-600">TF-103</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">Medium</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">Audit log service on task priority changes</p>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">3 pts</span>
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[9px] flex items-center justify-center">AL</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Col 4: Done */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Done</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">2</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-mono font-semibold text-blue-600">TF-101</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">Resolved</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800">Custom User model with UUID & normalized email</p>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-mono">5 pts</span>
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center">DS</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
