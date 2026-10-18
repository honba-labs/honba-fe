// Batch H (docs/tasks.md): live market state — quotes + depth per instrument, fed exclusively
// by the `core/ws` LiveSocket gateway (polling transport today; a real server WebSocket when
// honba grows one — see the gateway's header). Normalized by the wire key
// (`exchange:symbol`), fine-grained selectors for consumers; no fetch/REST logic here
// (TanStack Query owns request/response state in core/api).
//
// Shape follows plan.md §3.4's target pattern: socket → normalized Zustand slice →
// fine-grained selectors (the bfx-hf-ui-core socket→Redux→reducer flow, minus the
// action-per-tick dispatch).
import { create } from 'zustand';

import { instrumentIdKey } from '../types/messages';
import type { DepthResponse, InstrumentId, QuoteTick } from '../types/messages';

interface MarketState {
  /** Latest top-of-book quote per wire key (`exchange:symbol`). */
  quotes: Record<string, QuoteTick>;
  /** Latest book per wire key. Replaced wholesale per update, never merged. */
  depth: Record<string, DepthResponse>;
  applyQuote: (tick: QuoteTick) => void;
  applyDepth: (instrument: InstrumentId, book: DepthResponse) => void;
  getQuote: (instrument: InstrumentId) => QuoteTick | undefined;
  getDepth: (instrument: InstrumentId) => DepthResponse | undefined;
  reset: () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  quotes: {},
  depth: {},
  applyQuote: (tick) => {
    set((state) => ({
      quotes: { ...state.quotes, [instrumentIdKey(tick.instrument_id)]: tick },
    }));
  },
  applyDepth: (instrument, book) => {
    set((state) => ({
      depth: { ...state.depth, [instrumentIdKey(instrument)]: book },
    }));
  },
  getQuote: (instrument) => get().quotes[instrumentIdKey(instrument)],
  getDepth: (instrument) => get().depth[instrumentIdKey(instrument)],
  reset: () => set({ quotes: {}, depth: {} }),
}));
