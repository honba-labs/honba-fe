import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMarketStore } from './market';
import { useOrdersStore } from './orders';
import { usePositionsStore } from './positions';
import { useConnectionStore } from './connection';
import type { DepthResponse, QuoteTick } from '../types/messages';

const RELIANCE = { exchange: 'NSE', symbol: 'RELIANCE' };
const TCS = { exchange: 'NSE', symbol: 'TCS' };

function tick(overrides: Partial<QuoteTick> = {}): QuoteTick {
  return {
    instrument_id: RELIANCE,
    bid_price: 2980,
    bid_size: 50,
    ask_price: 2980.5,
    ask_size: 75,
    ts_event: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
    ts_init: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
    ...overrides,
  };
}

const depth: DepthResponse = {
  bids: [
    { price: 2979.5, size: 100 },
    { price: 2979, size: 200 },
  ],
  asks: [
    { price: 2980.5, size: 75 },
    { price: 2981, size: 150 },
  ],
};

beforeEach(() => {
  useMarketStore.getState().reset();
  useOrdersStore.getState().reset();
  usePositionsStore.getState().reset();
  useConnectionStore.getState().reset();
});

describe('useMarketStore', () => {
  it('applies a quote tick into per-instrument state', () => {
    useMarketStore.getState().applyQuote(tick());
    const quote = useMarketStore.getState().quotes['NSE:RELIANCE'];
    expect(quote).toEqual(tick());
  });

  it('overwrites the previous tick rather than accumulating history', () => {
    useMarketStore.getState().applyQuote(tick());
    useMarketStore.getState().applyQuote(tick({ bid_price: 2981 }));
    const quote = useMarketStore.getState().quotes['NSE:RELIANCE'];
    expect(quote?.bid_price).toBe(2981);
  });

  it('keys state by instrument id (two instruments coexist)', () => {
    useMarketStore.getState().applyQuote(tick());
    useMarketStore.getState().applyQuote(tick({ instrument_id: TCS, bid_price: 4100 }));
    expect(Object.keys(useMarketStore.getState().quotes).sort()).toEqual([
      'NSE:RELIANCE',
      'NSE:TCS',
    ]);
  });

  it('replaces the book (not merges) on each depth update', () => {
    useMarketStore.getState().applyDepth(RELIANCE, depth);
    useMarketStore.getState().applyDepth(RELIANCE, { bids: [{ price: 2970, size: 1 }], asks: [] });
    const book = useMarketStore.getState().depth['NSE:RELIANCE'];
    expect(book).toEqual({ bids: [{ price: 2970, size: 1 }], asks: [] });
  });

  it('getQuote selector hands the exact tick object out', () => {
    useMarketStore.getState().applyQuote(tick());
    expect(useMarketStore.getState().getQuote(RELIANCE)).toEqual(tick());
    expect(useMarketStore.getState().getQuote(TCS)).toBeUndefined();
  });
});

describe('useOrdersStore', () => {
  const order = {
    order_id: 'ORD-1',
    instrument_id: RELIANCE,
    side: 'buy' as const,
    order_type: 'limit' as const,
    status: 'submitted' as const,
    quantity: 10,
    filled_qty: 0,
    price: 2980,
    cancel_requested: false,
    time_in_force: 'day' as const,
    ts_event: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
    ts_init: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
  };

  it('replaceRows seeds the snapshot from GET /orders', () => {
    useOrdersStore.getState().replaceRows([order]);
    expect(useOrdersStore.getState().rows['ORD-1']).toEqual(order);
    expect(useOrdersStore.getState().orderIds).toEqual(['ORD-1']);
  });

  it('upsert updates one row in place by order_id (WS/lifecycle updates)', () => {
    useOrdersStore.getState().replaceRows([order]);
    useOrdersStore.getState().upsert({
      ...order,
      status: 'partially_filled',
      filled_qty: 4,
    });
    expect(useOrdersStore.getState().rows['ORD-1']).toMatchObject({
      status: 'partially_filled',
      filled_qty: 4,
    });
    expect(useOrdersStore.getState().orderIds).toEqual(['ORD-1']);
  });

  it('remove takes a row out of both map and order', () => {
    useOrdersStore.getState().replaceRows([order]);
    useOrdersStore.getState().remove('ORD-1');
    expect(useOrdersStore.getState().rows['ORD-1']).toBeUndefined();
    expect(useOrdersStore.getState().orderIds).toEqual([]);
  });

  it('clearStaleRows drops rows whose ids were absent from the last replaceRows', () => {
    useOrdersStore.getState().replaceRows([order]);
    useOrdersStore.getState().upsert({
      ...order,
      order_id: 'ORD-2',
      status: 'filled',
      filled_qty: 10,
      filled_at: { iso: '2026-10-18T09:16:00Z', unix_nanos: '9' },
    });
    // A fresh GET /orders no longer reports ORD-2 (it scrolled out of the window).
    useOrdersStore.getState().replaceRows([]);
    expect(useOrdersStore.getState().orderIds).toEqual([]);
  });
});

describe('usePositionsStore', () => {
  it('replaceRows + upsert manage valued position rows keyed by instrument', () => {
    const position = {
      instrument_id: RELIANCE,
      side: 'long' as const,
      quantity: 350,
      avg_price: 2961.2,
      mark: 2985.55,
      market_value: { amount: 104494250, currency: 'INR' },
      realized_pnl: { amount: 1245000, currency: 'INR' },
      unrealized_pnl: { amount: 8522500, currency: 'INR' },
      product: 'intraday' as const,
    };
    usePositionsStore.getState().replaceRows([position]);
    expect(usePositionsStore.getState().rows['NSE:RELIANCE']).toEqual(position);
    usePositionsStore.getState().upsert({ ...position, mark: 3000, unrealized_pnl: { amount: 13578000, currency: 'INR' } });
    expect(usePositionsStore.getState().rows['NSE:RELIANCE']?.mark).toBe(3000);
  });
});

describe('useConnectionStore', () => {
  it('moves connecting → live → failed via setStatus', () => {
    expect(useConnectionStore.getState().status).toBe('idle');
    useConnectionStore.getState().setStatus('connecting');
    expect(useConnectionStore.getState().status).toBe('connecting');
    useConnectionStore.getState().setStatus('live');
    expect(useConnectionStore.getState().status).toBe('live');
    useConnectionStore.getState().setStatus('failed');
    expect(useConnectionStore.getState().status).toBe('failed');
  });
});
