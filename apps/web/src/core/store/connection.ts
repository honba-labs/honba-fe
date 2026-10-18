// Batch H (docs/tasks.md): the shell's connection indicator — the store behind the topbar
// "Not connected" pill and the bottom StatusBar (both static until this existed; see the
// Batch F shell comments). The LiveSocket gateway (core/ws/socket.ts) drives it via setStatus;
// feature pages read the same status so every surface agrees on the connection state.
import { create } from 'zustand';

import type { LiveStatus } from '../ws/socket';

interface ConnectionState {
  status: LiveStatus;
  setStatus: (status: LiveStatus) => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
  reset: () => set({ status: 'idle' }),
}));
