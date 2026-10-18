// Batch I slice 3 (docs/tasks.md §Batch I): the Workbench becomes a real dockview workspace —
// dockview-react's first consumer (decision in docs/plan.md §3.3) — with its layout persisted
// to honba's /profile/layouts through useLayoutStore (Batch H). This test round-trips the
// live dockview document: boot default panels → Save → the same document restores a fresh
// workspace through GET /profile/layouts.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { createApiClient, type ApiClient } from '../../core/api/client';
import { createQueryClient, setApiClient, getApiClient } from '../../core/api/query';
import { setLiveSocket } from '../../core/liveSocket';
import { LiveSocket } from '../../core/ws/socket';
import { useLayoutStore } from '../../core/store/layout';
import { WorkbenchPage } from './WorkbenchPage';

// jsdom + dockview need sized containers (the Batch F spike's only assumption), and jsdom
// doesn't ship ResizeObserver (dockview sizes via it like the virtualizer does).
beforeEach(() => {
  class ResizeObserverStub {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  }
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 700 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 700 });
  useLayoutStore.getState().reset();
});

// Note: the workspace boots instruments/quotes via the LiveSocket — reuse the client-stub
// pattern from WorkbenchPage.test.tsx. The real request/response functions of the base
// client are kept, but the layout endpoints are the subject here.
const INSTRUMENTS = [
  { id: { exchange: 'NSE', symbol: 'RELIANCE' }, kind: 'equity', currency: 'INR', lot_size: 1, tick_size: 0.05 },
];

function stubbedStack(overrides: Partial<ApiClient> = {}) {
  const base = createApiClient({ baseUrl: '/api', fetchImpl: fetch });
  const client: ApiClient = {
    ...base,
    getInstruments: vi.fn().mockResolvedValue({ instruments: INSTRUMENTS }),
    getDepth: vi.fn().mockResolvedValue({ bids: [], asks: [] }),
    getQuotes: vi.fn().mockResolvedValue({ quotes: [] }),
    getOrders: vi.fn().mockResolvedValue({ orders: [] }),
    ...overrides,
  };
  setApiClient(client);
  const socket = new LiveSocket({ client, quoteIntervalMs: 60_000, depthIntervalMs: 60_000 });
  setLiveSocket(socket);
  return client;
}

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient({ retries: 0 })}>
      <WorkbenchPage />
    </QueryClientProvider>,
  );
}

describe('WorkbenchWorkspace (Batch I slice 3)', () => {
  it('boots the default panels and saves the live dockview document to /profile/layouts', async () => {
    const putLayout = vi.fn().mockResolvedValue({});
    const client = stubbedStack({ getLayouts: vi.fn().mockResolvedValue({ layouts: {} }), putLayout });
    renderPage();

    // Default layout boots the three functional panels (dockview tabs expose the panel title
    // via their accessible name; each preset group mounts its own content container).
    await screen.findAllByRole('tab');
    const tabTitles = screen.getAllByRole('tab').map((tab) => tab.textContent);
    for (const title of ['Order Book', 'Order Ticket', 'Working Orders']) {
      expect(tabTitles).toContain(title);
    }
    expect(document.querySelectorAll('.dv-content-container').length).toBeGreaterThanOrEqual(3);

    // Save → the live dockview document goes to PUT /profile/layouts/workbench-default.
    // (The Batch F toolbar unlocks Save when the dockview layout changed — dirty tracking.)
    const saveButton = await screen.findByRole('button', { name: 'Save' });
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);
    await waitFor(() => expect(putLayout).toHaveBeenCalledTimes(1));
    const [name, document_] = putLayout.mock.calls[0] as [string, unknown];
    expect(name).toBe('workbench-default');
    // The document is the serialized dockview state, not free-form JSON.
    expect(client.getLayouts).toHaveBeenCalled();
    expect(JSON.stringify(document_)).toContain('"grid"');
    // The store keeps the pointer to the saved layout.
    await waitFor(() => expect(useLayoutStore.getState().activeLayout).toBe('workbench-default'));
  });

  it('restores a saved layout for a fresh workspace (round-trip via /profile/layouts)', async () => {
    let captured: Record<string, unknown> | undefined;
    const putLayout = vi.fn().mockImplementation((_name: string, doc: Record<string, unknown>) => {
      captured = doc;
      return Promise.resolve({});
    });
    stubbedStack({
      getLayouts: vi.fn().mockResolvedValue({ layouts: {} }),
      putLayout,
    });
    const first = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(captured).toBeDefined());
    first.unmount();

    // Simulate a reload: a fresh client whose GET answers with the saved document.
    stubbedStack({
      getLayouts: vi.fn().mockResolvedValue({ layouts: { 'workbench-default': captured } }),
      putLayout,
    });
    renderPage();

    // The restored document brings the same panels back.
    const tabTitles = (await screen.findAllByRole('tab')).map((tab) => tab.textContent);
    for (const title of ['Order Book', 'Order Ticket', 'Working Orders']) {
      expect(tabTitles).toContain(title);
    }
    expect(document.querySelectorAll('.dv-content-container').length).toBeGreaterThanOrEqual(3);
    await waitFor(() => expect(useLayoutStore.getState().activeLayout).toBe('workbench-default'));
    cleanup();
  });
});
