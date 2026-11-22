import React from 'react';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { WifiOff, RefreshCw } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const { status, reconnectAttempts } = useRealtimeStore();

  if (status === 'connected') {
    return (
      <div
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
        title="Real-time multi-tenant sync is active"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold tracking-tight">Live Sync</span>
      </div>
    );
  }

  if (status === 'reconnecting' || status === 'connecting') {
    return (
      <div
        className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs"
        title={`Reconnecting to real-time channel (Attempt ${reconnectAttempts})...`}
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
        <span className="font-medium">
          {status === 'connecting' ? 'Connecting...' : `Reconnecting (${reconnectAttempts})`}
        </span>
      </div>
    );
  }

  return (
    <div
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 shadow-2xs"
      title="WebSocket offline. Operating in resilient REST fallback mode."
    >
      <WifiOff className="w-3 h-3 text-slate-400" />
      <span className="font-medium">REST Mode</span>
    </div>
  );
};
