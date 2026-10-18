// Batch H (docs/tasks.md): valued open positions (`GET /portfolio/positions` →
// `PortfolioPosition[]`, ADR 0032 §6), keyed by wire instrument key. Close requests are
// tracked in `closePending` so the UI can disable a row's close button between click and
// `POST /positions/close` resolution (the batch-G ClosePositionModal's onConfirm consumer).
import { create } from 'zustand';

import { instrumentIdKey } from '../types/messages';
import type { InstrumentId, PortfolioPosition } from '../types/messages';

interface PositionsState {
  rows: Record<string, PortfolioPosition>;
  /** Instrument keys with a close request in flight. */
  closePending: string[];
  replaceRows: (positions: PortfolioPosition[]) => void;
  upsert: (position: PortfolioPosition) => void;
  setClosePending: (instrument: InstrumentId, pending: boolean) => void;
  reset: () => void;
}

export const usePositionsStore = create<PositionsState>((set) => ({
  rows: {},
  closePending: [],
  replaceRows: (positions) => {
    const rows: Record<string, PortfolioPosition> = {};
    for (const position of positions) {
      rows[instrumentIdKey(position.instrument_id)] = position;
    }
    set({ rows });
  },
  upsert: (position) => {
    set((state) => ({
      rows: { ...state.rows, [instrumentIdKey(position.instrument_id)]: position },
    }));
  },
  setClosePending: (instrument, pending) => {
    const key = instrumentIdKey(instrument);
    set((state) => ({
      closePending: pending
        ? state.closePending.includes(key)
          ? state.closePending
          : [...state.closePending, key]
        : state.closePending.filter((k) => k !== key),
    }));
  },
  reset: () => set({ rows: {}, closePending: [] }),
}));
