// Ops Store - live trading operations state
// Mirrors honba-frontend core/designer/ops-state.ts

import { create } from 'zustand';
import type { ApiClient } from '../../core/api/client';
import type { Order } from '../../core/types/messages';

export interface OpsOrder {
  order_id: string;
  instrument_id: { symbol: string; exchange: string };
  side: string;
  quantity: number;
  order_type: string;
  status: string;
  filled_qty?: number;
  avg_fill_price?: number | null;
}

export interface OpsLogEntry {
  ts: number;
  level: 'info' | 'warning' | 'error';
  text: string;
}

export interface OpsBadge {
  label: string;
  blocked: boolean;
}

export interface OpsState {
  mode: 'paper' | 'signal_only' | 'live';
  killSwitch: boolean;
  orders: OpsOrder[];
  log: OpsLogEntry[];
  error?: string;
  approved: boolean;

  setMode: (mode: 'paper' | 'signal_only' | 'live') => void;
  setKillSwitch: (value: boolean) => void;
  refresh: (client: ApiClient) => Promise<void>;
  closePositions: (client: ApiClient) => Promise<void>;
  cancelOrder: (client: ApiClient, orderId: string) => Promise<void>;
  addLog: (level: OpsLogEntry['level'], text: string) => void;
  badge: () => OpsBadge;
}

function initialState(): Omit<OpsState, 'setMode' | 'setKillSwitch' | 'refresh' | 'closePositions' | 'cancelOrder' | 'addLog' | 'badge'> {
  return {
    mode: 'paper',
    killSwitch: false,
    orders: [],
    log: [],
    approved: false,
  };
}

export const useOpsStore = create<OpsState>((set, get) => ({
  ...initialState(),

  setMode: (mode) => {
    set({ mode });
    get().addLog('info', `Execution mode changed to ${mode}`);
  },

  setKillSwitch: (value) => {
    set({ killSwitch: value });
    get().addLog(value ? 'warning' : 'info', value ? 'Kill switch ENGAGED' : 'Kill switch released');
  },

  badge: () => {
    const { mode, killSwitch } = get();
    if (killSwitch) return { label: 'KILL SWITCH', blocked: true };
    if (mode === 'live' && !get().approved) return { label: 'LIVE (pending approval)', blocked: true };
    return { label: mode.toUpperCase(), blocked: false };
  },

  refresh: async (client) => {
    get().addLog('info', 'Refreshing live orders...');
    try {
      const { orders } = await client.getOrders();
      const opsOrders: OpsOrder[] = orders.map((o) => ({
        order_id: o.order_id,
        instrument_id: o.instrument_id,
        side: o.side,
        quantity: o.quantity,
        order_type: o.order_type,
        status: o.status,
        filled_qty: o.filled_qty,
        avg_fill_price: o.avg_fill_price ?? null,
      }));
      set({ orders: opsOrders, error: undefined });
      get().addLog('info', `Refreshed ${opsOrders.length} orders`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
      get().addLog('error', `Refresh failed: ${message}`);
    }
  },

  closePositions: async (client) => {
    get().addLog('warning', 'Emergency close all positions requested');
    try {
      await client.postPositionsClose();
      get().addLog('info', 'Close all positions submitted');
      await get().refresh(client);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().addLog('error', `Close all failed: ${message}`);
    }
  },

  cancelOrder: async (client, orderId) => {
    get().addLog('info', `Cancelling order ${orderId}`);
    try {
      await client.deleteOrder(orderId);
      get().addLog('info', `Order ${orderId} cancelled`);
      await get().refresh(client);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      get().addLog('error', `Cancel failed: ${message}`);
    }
  },

  addLog: (level, text) => {
    const entry: OpsLogEntry = { ts: Date.now(), level, text };
    set((state) => ({ log: [entry, ...state.log].slice(0, 200) }));
  },
}));