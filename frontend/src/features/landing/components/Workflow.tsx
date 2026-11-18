import React from 'react';
import { Layers, Calendar, Kanban, BarChart3, ChevronRight } from 'lucide-react';

export const Workflow: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: <Layers className="w-5 h-5 text-blue-600" />,
      title: 'Backlog Grooming & Estimation',
      description:
        'Decompose company initiatives into Epics, User Stories, Tasks, and Bugs. Assign Fibonacci story points for predictable delivery.',
    },
    {
      step: '02',
      icon: <Calendar className="w-5 h-5 text-indigo-600" />,
      title: 'Sprint Planning & Commitment',
      description:
        'Scope target work items into time-boxed 2-week sprints matching calibrated team bandwidth and historic velocity.',
    },
    {
      step: '03',
      icon: <Kanban className="w-5 h-5 text-purple-600" />,
      title: 'Live Kanban Board Execution',
      description:
        'Progress tasks across To Do, In Progress, Review, and Done with atomic database transactions and instant team visibility.',
    },
    {
      step: '04',
      icon: <BarChart3 className="w-5 h-5 text-emerald-600" />,
      title: 'Burndown & Retrospective',
      description:
        'Measure completed points against sprint goals with automated velocity analytics to continuously optimize engineering cadence.',
    },
  ];

  return (
    <section id="workflow" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Agile Sprint Lifecycle
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            From idea to production in four structured phases
          </p>
          <p className="mt-4 text-base text-slate-600">
            TaskFlow standardizes your software delivery cycle so your team ships reliable software on every sprint iteration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-200 relative flex flex-col justify-between hover:border-slate-300 hover:bg-slate-100/60 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                    {s.icon}
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-400">{s.step}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{s.description}</p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                  <ChevronRight className="w-6 h-6" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
