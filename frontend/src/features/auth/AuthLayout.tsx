import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 bg-slate-50 font-sans antialiased text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Header Link */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">TaskFlow</span>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Centered Auth Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {children}
      </div>

      {/* Bottom Footer Attribution */}
      <div className="mt-8 text-center text-xs text-slate-400">
        TaskFlow Platform • Made with precision by Devam Mandli
      </div>
    </div>
  );
};
