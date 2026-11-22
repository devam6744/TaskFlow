import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface RealtimeState {
  status: ConnectionStatus;
  lastEventAt: number | null;
  reconnectAttempts: number;
  setStatus: (status: ConnectionStatus) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  recordEventReceived: () => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'disconnected',
  lastEventAt: null,
  reconnectAttempts: 0,
  setStatus: (status) => set({ status }),
  incrementReconnectAttempts: () =>
    set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
  recordEventReceived: () => set({ lastEventAt: Date.now() }),
}));
