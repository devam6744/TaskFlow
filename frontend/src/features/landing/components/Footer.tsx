import React from 'react';
import { Layers, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer id="about" className="bg-white border-t border-slate-200 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">TaskFlow</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Enterprise
              </span>
            </div>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
              TaskFlow is an enterprise-grade Agile Project Management & Scrum system built for modern software teams with multi-tenant isolation, atomic state transitions, and real-time execution.
            </p>
          </div>

          {/* Col 2: Platform Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Platform</h4>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li>
                <Link to="/login" className="hover:text-blue-600 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-blue-600 transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-blue-600 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-blue-600 transition-colors">
                  Agile Workflow
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Developer & Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Developer & Contact</h4>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="text-slate-900 font-semibold text-sm">Devam Mandli</div>
              
              <a
                href="mailto:mandlidevam9@gmail.com"
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
              >
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">mandlidevam9@gmail.com</span>
              </a>

              <a
                href="https://linkedin.com/devam-mandli"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <span>linkedin.com/devam-mandli</span>
              </a>

              <a
                href="https://github.com/devam6744"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-800 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>github.com/devam6744</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} TaskFlow Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span>Made with precision by</span>
            <a
              href="https://github.com/devam6744"
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-semibold hover:text-blue-600 transition-colors"
            >
              Devam Mandli
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
