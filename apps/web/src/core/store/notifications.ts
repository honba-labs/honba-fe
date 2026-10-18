// Batch F (docs/tasks.md): the app-owned notifications store. The reference backed its
// NotificationsSidebar with a Redux-saga notification queue; per the brief the equivalent here
// is a small Zustand store owned by apps/web (NOT ui-core — notifications are app state, not a
// presentational primitive). Consumers: the shell topbar bell + NotificationsSidebar +
// NotificationToasts. `push` is the single entry feature code / WS handlers will call
// (Batch H wires it to `/ws` errors + order fills).
import { create } from 'zustand';

import type { NotificationRow, NotificationSeverity } from '@honba/ui-core';

interface NotificationsState {
  rows: NotificationRow[];
  /** Sidebar visibility (the reference's redux `notificationsVisible`). */
  visible: boolean;
  push: (notification: { severity: NotificationSeverity; title?: string; message: string }) => void;
  /** Dismiss one row by `cid` (also closes its sidebar / toast). */
  remove: (cid: string) => void;
  clearAll: () => void;
  setVisible: (visible: boolean) => void;
}

function nextCid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Non-crypto fallback (older browsers / some test environments).
  return `n-${Math.random().toString(36).slice(2)}`;
}

export const useNotifications = create<NotificationsState>((set) => ({
  rows: [],
  visible: false,
  push: ({ severity, title, message }) =>
    set((state) => ({
      rows: [
        ...state.rows,
        { cid: nextCid(), ts: Date.now(), severity, title, message },
      ],
    })),
  remove: (cid) => set((state) => ({ rows: state.rows.filter((row) => row.cid !== cid) })),
  clearAll: () => set({ rows: [] }),
  setVisible: (visible) => set({ visible }),
}));
