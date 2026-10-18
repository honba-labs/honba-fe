// Batch H (docs/tasks.md): workbench layouts persisted to honba's `/profile/layouts`
// (docs/plan.md §3.3). Layout documents are opaque JSON to the server — for dockview workspaces
// this is `api.toJSON()`/`fromJSON()` round-tripped (the Batch F spike proved both directions
// under React 19). The store is the single owner of the layout list + active pointer; the
// dockview host (Batch I's Workbench workspaces) calls save/remove/load through here, and the
// client stays a parameter so tests can inject the typed ApiClient without network.
import { create } from 'zustand';

import type { ApiClient } from '../api/client';
import type { LayoutDocument } from '../types/messages';

type LayoutStoreStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LayoutsState {
  layouts: Record<string, LayoutDocument>;
  /** The layout the workbench is currently running (null = unsaved/ad-hoc). */
  activeLayout: string | null;
  status: LayoutStoreStatus;
  error?: string;
  load: (client: ApiClient) => Promise<void>;
  /** Optimistic: apply locally, then PUT; roll the local entry back if the PUT fails. */
  save: (client: ApiClient, name: string, layoutDocument: LayoutDocument) => Promise<void>;
  remove: (client: ApiClient, name: string) => Promise<void>;
  setActive: (name: string | null) => void;
  reset: () => void;
}

export const useLayoutStore = create<LayoutsState>((set, get) => ({
  layouts: {},
  activeLayout: null,
  status: 'idle',
  load: async (client) => {
    set({ status: 'loading', error: undefined });
    try {
      const { layouts } = await client.getLayouts();
      set({ layouts, status: 'ready' });
    } catch (error) {
      set({ status: 'error', error: (error as Error).message });
    }
  },
  save: async (client, name, layoutDocument) => {
    const previous = get().layouts[name];
    set((state) => ({ layouts: { ...state.layouts, [name]: layoutDocument } }));
    try {
      await client.putLayout(name, layoutDocument);
      set({ status: 'ready', error: undefined });
    } catch (error) {
      set((state) => {
        const layouts = { ...state.layouts };
        if (previous === undefined) {
          delete layouts[name];
        } else {
          layouts[name] = previous;
        }
        return { layouts, status: 'error', error: (error as Error).message };
      });
    }
  },
  remove: async (client, name) => {
    const previous = get().layouts[name];
    set((state) => {
      const layouts = { ...state.layouts };
      delete layouts[name];
      return {
        layouts,
        activeLayout: state.activeLayout === name ? null : state.activeLayout,
      };
    });
    try {
      await client.deleteLayout(name);
      set({ status: 'ready', error: undefined });
    } catch (error) {
      set((state) => ({
        layouts: previous ? { ...state.layouts, [name]: previous } : state.layouts,
        status: 'error',
        error: (error as Error).message,
      }));
    }
  },
  setActive: (name) => set({ activeLayout: name }),
  reset: () => set({ layouts: {}, activeLayout: null, status: 'idle', error: undefined }),
}));
