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
import type { DepthResponse, Instrument } from '../../core/types/messages';
import { useMarketStore } from '../../core/store/market';
import { useConnectionStore } from '../../core/store/connection';
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
