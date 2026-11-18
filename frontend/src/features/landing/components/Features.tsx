import React from 'react';
import { Building2, Kanban, FolderGit2, ShieldCheck, History, Activity } from 'lucide-react';

export const Features: React.FC = () => {
  const featureList = [
    {
      icon: <Building2 className="w-5 h-5 text-blue-600" />,
      title: 'Multi-Tenant Workspaces',
      description:
        'Full tenant isolation per organization. Seamlessly invite team members, generate join codes, and control data boundaries.',
    },
    {
      icon: <Kanban className="w-5 h-5 text-indigo-600" />,
      title: 'Active Sprint Kanban Board',
      description:
        'Drag-and-drop state machines supporting To Do, In Progress, Review, and Done with atomic database transitions.',
    },
    {
      icon: <FolderGit2 className="w-5 h-5 text-cyan-600" />,
      title: 'Hierarchical Backlog Structure',
      description:
        'Organize high-level business Epics, break down into User Stories, Bugs, and Tasks with precise Fibonacci point estimation.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: 'Granular Role-Based Access (RBAC)',
      description:
        'Define Admin, Member, and Viewer roles with strict server-enforced permissions on every API request.',
    },
    {
      icon: <History className="w-5 h-5 text-amber-600" />,
      title: 'Audit Logs & Change Tracking',
      description:
        'Immutable audit trails record work item updates, status modifications, priority changes, and team assignments.',
    },
    {
      icon: <Activity className="w-5 h-5 text-rose-600" />,
      title: 'Velocity & Burn-up Metrics',
      description:
        'Real-time calculation of sprint health, completed story points, remaining capacity, and team delivery velocity.',
    },
  ];

  return (
    <section id="features" className="py-20 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Enterprise Architecture
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Engineered for high-performing engineering organizations
          </p>
          <p className="mt-4 text-base text-slate-600">
            Every component is architected for clean separation of concerns, multi-tenant security, and real-time execution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureList.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
