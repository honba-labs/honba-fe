// Batch H end-to-end slice (docs/tasks.md §Batch H exit): the Workbench OrderBook renders
// live depth through the full stack — MarketSelect → LiveSocket (polling transport, mocked
// client here) → useMarketStore subscription → ui-core OrderBookPanel — with the connection
// indicator following the same gateway's status.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { createApiClient, type ApiClient } from '../../core/api/client';
import { createQueryClient, setApiClient } from '../../core/api/query';
import type { DepthResponse, Instrument, Order as WireOrder } from '../../core/types/messages';
import { useMarketStore } from '../../core/store/market';
import { useConnectionStore } from '../../core/store/connection';
import { useOrdersStore } from '../../core/store/orders';
import { LiveSocket } from '../../core/ws/socket';
import { setLiveSocket } from '../../core/liveSocket';
import { WorkbenchPage } from './WorkbenchPage';

// Route data (GET /instruments) and streaming payloads are injected through the client
// stub; timers are real but the socket's first fetch happens on subscribe, so no waiting
// is needed for a single render cycle.
const INSTRUMENTS: Instrument[] = [
  { id: { exchange: 'NSE', symbol: 'RELIANCE' }, kind: 'equity', currency: 'INR', lot_size: 1, tick_size: 0.05 },
  { id: { exchange: 'NSE', symbol: 'TCS' }, kind: 'equity', currency: 'INR', lot_size: 1, tick_size: 0.05 },
];

const DEPTH: DepthResponse = {
  bids: [
    { price: 2979.5, size: 1200 },
    { price: 2979, size: 800 },
  ],
  asks: [
    { price: 2980.5, size: 700 },
    { price: 2981, size: 400 },
  ],
};

function stubbedStack(overrides: Partial<ApiClient> = {}) {
  const base = createApiClient({ baseUrl: '/api', fetchImpl: fetch });
  const client: ApiClient = {
    ...base,
    getInstruments: vi.fn().mockResolvedValue({ instruments: INSTRUMENTS }),
    getDepth: vi.fn().mockResolvedValue(DEPTH),
    getQuotes: vi.fn().mockResolvedValue({ quotes: [] }),
    ...overrides,
  };
  // The query hooks and the LiveSocket must share the same injected client.
  setApiClient(client);
  return client;
}

beforeEach(() => {
  useMarketStore.getState().reset();
  useConnectionStore.getState().reset();
});

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient({ retries: 0 })}>
      <WorkbenchPage />
    </QueryClientProvider>,
  );
}

function openMarketSelect() {
  // The dropdown button shows the placeholder ('Select a market') once instruments land,
  // so awaiting it both proves the fetch resolved AND that the option list is populated.
  return screen.findByRole('button', { name: /select a market/i });
}

describe('WorkbenchPage (Batch H end-to-end slice)', () => {
  it('lists instruments from the API and shows the pick-a-market prompt first', async () => {
    const client = stubbedStack();
    setLiveSocket(new LiveSocket({ client, quoteIntervalMs: 60_000, depthIntervalMs: 60_000 }));
    renderPage();

    // Instruments arrive; open the MarketSelect to see them.
    fireEvent.click(await openMarketSelect());
    expect(screen.getByText('NSE:RELIANCE')).toBeInTheDocument();
    expect(screen.getByText('NSE:TCS')).toBeInTheDocument();
    // No book yet before a selection; gateway still idle.
    expect(useConnectionStore.getState().status).toBe('idle');
  });

  it('streams the selected instrument book into the OrderBookPanel via useMarketStore', async () => {
    const client = stubbedStack();
    const socket = new LiveSocket({ client, quoteIntervalMs: 60_000, depthIntervalMs: 60_000 });
    setLiveSocket(socket);
    renderPage();

    // Pick RELIANCE from the market dropdown.
    fireEvent.click(await openMarketSelect());
    fireEvent.click(screen.getByText('NSE:RELIANCE'));

    // The gateway fetched the book and the store holds it; the panel renders levels.
    await waitFor(() =>
      expect(useMarketStore.getState().getDepth({ exchange: 'NSE', symbol: 'RELIANCE' })).toEqual(DEPTH),
    );
    expect(screen.getByText('2,979.50')).toBeInTheDocument();
    expect(screen.getByText('2,981.00')).toBeInTheDocument();
    // Connected: the first successful depth fetch flipped the status.
    expect(useConnectionStore.getState().status).toBe('live');
  });

  it('shows the reconnecting status when the transport fails', async () => {
    const failing = stubbedStack({
      getDepth: vi.fn().mockRejectedValue(new Error('boom')),
      getQuotes: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const socket = new LiveSocket({
      client: failing,
      quoteIntervalMs: 60_000,
      depthIntervalMs: 60_000,
      failureThreshold: 5,
    });
    setLiveSocket(socket);
    renderPage();

    fireEvent.click(await openMarketSelect());
    fireEvent.click(screen.getByText('NSE:RELIANCE'));
    await waitFor(() => expect(useConnectionStore.getState().status).toBe('reconnecting'));
    expect(screen.getByText(/Reconnecting…/)).toBeInTheDocument();
  });
});

// --- Batch I slice 2: order entry (ticket → POST /orders, orders panel, cancel) -----------------
// Table containers need sized stubs for @tanstack/react-virtual (same tolerances as the
// component-dashboard test).
beforeEach(() => {
  class ResizeObserverStub {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  }
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
  useOrdersStore.getState().reset();
});

const WORKING_ORDER: WireOrder = {
  order_id: 'ord-1',
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'buy',
  order_type: 'limit',
  status: 'accepted',
  quantity: 10,
  price: 2950,
  time_in_force: 'day',
  ts_event: { iso: '2026-10-19T04:00:00Z', unix_nanos: '1760846400000000000' },
  ts_init: { iso: '2026-10-19T04:00:00Z', unix_nanos: '1760846400000000000' },
};

describe('WorkbenchPage order entry (Batch I slice 2)', () => {
  it('reconciles the orders store from GET /orders and cancels a working order via DELETE', async () => {
    const client = stubbedStack({
      getOrders: vi.fn().mockResolvedValue({ orders: [WORKING_ORDER] }),
      deleteOrder: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    });
    setLiveSocket(new LiveSocket({ client, quoteIntervalMs: 60_000, depthIntervalMs: 60_000 }));
    renderPage();

    // The orders panel shows the snapshot row.
    expect(await screen.findByText('ord-1')).toBeInTheDocument();
    // Store reconciled from the snapshot too (the fill/cancel-path subscribers' target).
    expect(useOrdersStore.getState().orderIds).toEqual(['ord-1']);

    // Cancel control → DELETE /orders/{id}.
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(client.deleteOrder).toHaveBeenCalledWith('ord-1'));
  });

  it('submits the order ticket through POST /orders and upserts the returned row', async () => {
    const placedOrder: WireOrder = {
      ...WORKING_ORDER,
      order_id: 'ord-2',
      status: 'accepted',
    };
    const postOrder = vi.fn().mockResolvedValue(placedOrder);
    const client = stubbedStack({ postOrder });
    setLiveSocket(new LiveSocket({ client, quoteIntervalMs: 60_000, depthIntervalMs: 60_000 }));
    renderPage();

    // Need a selected instrument before the ticket renders.
    fireEvent.click(await openMarketSelect());
    fireEvent.click(screen.getByText('NSE:RELIANCE'));

    // Fill the ticket: Buy, market order, 10 lots (default order type is Market so no
    // dropdown interaction needed; ui-core Input labels are <p>, so find by placeholder).
    fireEvent.click(screen.getByLabelText('Buy'));
    const qty = screen.getByPlaceholderText('Qty');
    fireEvent.change(qty, { target: { value: '10' } });

    fireEvent.submit(screen.getByRole('button', { name: 'Buy' }).closest('form')!);

    // Wire body: draft → OrdersRequest (client_order_id auto-generated as idempotency key).
    await waitFor(() => expect(postOrder).toHaveBeenCalledTimes(1));
    const body = postOrder.mock.calls[0][0];
    expect(body).toMatchObject({
      instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
      side: 'buy',
      order_type: 'market',
      qty: 10,
      tif: 'day',
    });
    expect(body.client_order_id).toBeTruthy();

    // The row lands in the store (upsert) and the open-orders panel.
    await waitFor(() => expect(useOrdersStore.getState().orderIds).toContain('ord-2'));
    expect(await screen.findByText('ord-2')).toBeInTheDocument();
  });
});
