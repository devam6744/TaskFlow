import React from 'react';
import { ShieldCheck, KeyRound, Lock, EyeOff } from 'lucide-react';

export const Security: React.FC = () => {
  const securityFeatures = [
    {
      icon: <KeyRound className="w-5 h-5 text-blue-600" />,
      title: 'Dual-Token JWT Architecture',
      description:
        'Access tokens reside purely in memory with short 15-minute TTL. Long-lived refresh tokens are stored in HttpOnly, SameSite=Lax cookies, completely immune to JavaScript XSS theft.',
    },
    {
      icon: <Lock className="w-5 h-5 text-indigo-600" />,
      title: 'Multi-Tenant Data Isolation',
      description:
        'Every workspace operates in a zero-trust tenant perimeter. Database queries are strictly scoped to the authenticated organization with UUID primary keys to prevent IDOR enumeration.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: 'Granular RBAC Enforced on Backend',
      description:
        'Role permissions (Admin, Member, Viewer) are verified on every API request. Destructive operations require explicit workspace administrative credentials.',
    },
    {
      icon: <EyeOff className="w-5 h-5 text-purple-600" />,
      title: 'Anti-Enumeration & Rate Limiting',
      description:
        'Uniform 401 responses protect against user discovery attacks. Automated per-IP rate-limiting protects against credential stuffing and automated brute force.',
    },
  ];

  return (
    <section id="security" className="py-20 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
            Enterprise Security
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Security engineered into the foundation
          </p>
          <p className="mt-4 text-base text-slate-600">
            TaskFlow enforces enterprise data protection and identity hygiene across every API and interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {securityFeatures.map((sec, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                {sec.icon}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">{sec.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{sec.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
