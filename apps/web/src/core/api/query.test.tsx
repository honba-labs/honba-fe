import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient, queryKeys, useCancelOrder, useDepth, useInstruments, useOrders, usePlaceOrder, usePositions, useQuotes, useTradingState } from './query';
import { createApiClient, HonbaApiError } from './client';
import type { DepthResponse, QuoteTick } from '../types/messages';

// The query layer's one seam: getApiClient() lazily creates a client via createApiClient, which
// is mocked wholesale here so hooks are tested against the recorded client calls.
vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>();
  return { ...actual, createApiClient: vi.fn() };
});

const RELIANCE = { exchange: 'NSE', symbol: 'RELIANCE' };

const tick: QuoteTick = {
  instrument_id: RELIANCE,
  bid_price: 2980,
  bid_size: 50,
  ask_price: 2980.5,
  ask_size: 75,
  ts_event: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
  ts_init: { iso: '2026-10-18T09:15:00Z', unix_nanos: '1' },
};

const depth: DepthResponse = { bids: [{ price: 2980, size: 1 }], asks: [{ price: 2980.5, size: 1 }] };

const mockClient = {
  getInstruments: vi.fn().mockResolvedValue({ instruments: [] }),
  getQuotes: vi.fn().mockResolvedValue({ quotes: [tick] }),
  getDepth: vi.fn().mockResolvedValue(depth),
  getOrders: vi.fn().mockResolvedValue({ orders: [] }),
  getPositions: vi.fn().mockResolvedValue({ positions: [] }),
  getTradingState: vi.fn().mockResolvedValue('active'),
  postOrder: vi.fn().mockResolvedValue({ order_id: 'ORD-9' }),
  deleteOrder: vi.fn().mockResolvedValue({ status: 'cancelled' }),
};

beforeEach(() => {
  vi.mocked(createApiClient).mockReturnValue(mockClient as never);
  for (const fn of Object.values(mockClient)) {
    (fn as ReturnType<typeof vi.fn>).mockClear();
  }
});

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('queryKeys', () => {
  it('is a stable, hierarchical key set', () => {
    expect(queryKeys.instruments()).toEqual(['instruments', {}]);
    expect(queryKeys.depth(RELIANCE)).toEqual(['depth', 'NSE', 'RELIANCE']);
    expect(queryKeys.orders({ symbol: 'RELIANCE' })).toEqual(['orders', { symbol: 'RELIANCE' }]);
  });
});

describe('query hooks', () => {
  it('useInstruments fetches the instrument list', async () => {
    const client = createQueryClient({ retries: 0 });
    const { result } = renderHook(() => useInstruments(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.getInstruments).toHaveBeenCalledWith(undefined);
  });

  it('useQuotes passes the symbol list through', async () => {
    const client = createQueryClient({ retries: 0 });
    const { result } = renderHook(() => useQuotes('RELIANCE,TCS'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.getQuotes).toHaveBeenCalledWith({ symbols: 'RELIANCE,TCS' });
    expect(result.current.data?.quotes[0]).toEqual(tick);
  });

  it('useDepth is disabled while no instrument is selected', () => {
    const client = createQueryClient({ retries: 0 });
    const { result } = renderHook(() => useDepth(null), { wrapper: wrapperFor(client) });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockClient.getDepth).not.toHaveBeenCalled();
  });

  it('useDepth polls the selected instrument', async () => {
    const client = createQueryClient({ retries: 0 });
    const { result } = renderHook(
      () => useDepth(RELIANCE, { refetchIntervalMs: 1000 }),
      { wrapper: wrapperFor(client) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockClient.getDepth).toHaveBeenCalledWith(RELIANCE, {});
  });

  it('useOrders + usePositions + useTradingState read their resources', async () => {
    const client = createQueryClient({ retries: 0 });
    const orders = renderHook(() => useOrders(), { wrapper: wrapperFor(client) });
    const positions = renderHook(() => usePositions(), { wrapper: wrapperFor(client) });
    const state = renderHook(() => useTradingState(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(orders.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(positions.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(state.result.current.isSuccess).toBe(true));
    expect(mockClient.getOrders).toHaveBeenCalledTimes(1);
    expect(mockClient.getPositions).toHaveBeenCalledTimes(1);
  });

  it('usePlaceOrder submits and invalidates the mounted orders/positions queries', async () => {
    const client = createQueryClient({ retries: 0 });
    // The queries must be mounted (active) for invalidation to trigger a refetch.
    renderHook(() => useOrders(), { wrapper: wrapperFor(client) });
    renderHook(() => usePositions(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(mockClient.getOrders).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockClient.getPositions).toHaveBeenCalledTimes(1));

    const { result } = renderHook(() => usePlaceOrder(), { wrapper: wrapperFor(client) });
    await result.current.mutateAsync({
      instrument_id: RELIANCE,
      side: 'buy',
      order_type: 'limit',
      qty: 10,
      price: 2980,
      tif: 'day',
    });
    expect(mockClient.postOrder).toHaveBeenCalledTimes(1);
    // Invalidation is observable: orders/positions queries refetch after the mutation.
    await waitFor(() => expect(mockClient.getOrders).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockClient.getPositions).toHaveBeenCalledTimes(2));
  });

  it('useCancelOrder deletes and invalidates the mounted orders query', async () => {
    const client = createQueryClient({ retries: 0 });
    renderHook(() => useOrders(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(mockClient.getOrders).toHaveBeenCalledTimes(1));

    const { result } = renderHook(() => useCancelOrder(), { wrapper: wrapperFor(client) });
    await result.current.mutateAsync('ORD-1');
    expect(mockClient.deleteOrder).toHaveBeenCalledWith('ORD-1');
    await waitFor(() => expect(mockClient.getOrders).toHaveBeenCalledTimes(2));
  });
});

describe('createQueryClient', () => {
  it('retries retryable failures within budget, never 4xx refusals', () => {
    const client = createQueryClient({ retries: 2 });
    expect(client.getDefaultOptions().queries?.retry).toBeTypeOf('function');
    const retry = client.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;

    const retryable = new HonbaApiError({
      code: 'timeout',
      message: 'upstream did not answer',
      retryable: true,
    });
    const refusal = new HonbaApiError({
      code: 'risk_trading_halted',
      message: 'halted',
      retryable: false,
    });
    expect(retry(0, retryable)).toBe(true);
    expect(retry(2, retryable)).toBe(false);
    expect(retry(0, refusal)).toBe(false);
    expect(retry(0, new Error('plain'))).toBe(true);
  });
});
