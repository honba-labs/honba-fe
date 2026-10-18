// Batch I slice 1 (docs/tasks.md §Batch I): the Portfolio route assembles Batch D's panels
// around Batch H's data layer — snapshot KPIs from GET /portfolio, accounts/holdings via
// BalancesTablePanel, positions via PositionsTablePanel + Batch G's ClosePositionModal, and
// trades via TradesTablePanel. All data is routed through the TanStack hooks whose client is
// stubbed here (same injection pattern as WorkbenchPage.test.tsx).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { createApiClient, type ApiClient } from '../../core/api/client';
import { createQueryClient, setApiClient } from '../../core/api/query';
import type {
  PortfolioAccount,
  PortfolioPosition,
  PortfolioSnapshot,
  Trade,
} from '../../core/types/messages';
import { useNotifications } from '../../core/store/notifications';
import { PortfolioPage } from './PortfolioPage';

// Tables need jsdom stubs wherever demos are tested (operating note): ResizeObserver +
// element heights @tanstack/react-virtual can size against.
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
});

const SNAPSHOT: PortfolioSnapshot = {
  accounts: [],
  as_of: { iso: '2026-10-19T04:00:00Z', unix_nanos: '1760846400000000000' },
  base_currency: 'INR',
  owner: 'default',
  revision: 7,
  totals: {
    cash: { amount: 25_00_00, currency: 'INR' },
    equity: { amount: 31_50_00, currency: 'INR' },
    market_value: { amount: 6_50_00, currency: 'INR' },
    realized_pnl: { amount: 5_000, currency: 'INR' },
    unrealized_pnl: { amount: -2_500, currency: 'INR' },
    total_pnl: { amount: 2_500, currency: 'INR' },
  },
};

const ACCOUNTS: PortfolioAccount[] = [
  {
    id: 'acc-1',
    name: 'Paper Main',
    broker: null,
    mode: 'sandbox',
    currency: 'INR',
    cash: { amount: 25_00_00, currency: 'INR' },
    equity: { amount: 31_50_00, currency: 'INR' },
    market_value: { amount: 6_50_00, currency: 'INR' },
    margin_used: { amount: 0, currency: 'INR' },
    margin_available: { amount: 25_00_00, currency: 'INR' },
    leverage: 1,
    realized_pnl: { amount: 5_000, currency: 'INR' },
    unrealized_pnl: { amount: -2_500, currency: 'INR' },
    source: 'ledger',
    holdings: [
      {
        instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
        quantity: 20,
        avg_price: 2900,
        mark: 2950,
        market_value: { amount: 5_90_00, currency: 'INR' },
        realized_pnl: { amount: 0, currency: 'INR' },
        unrealized_pnl: { amount: 10_00, currency: 'INR' },
      },
    ],
    positions: [],
  },
];

const POSITIONS: PortfolioPosition[] = [
  {
    instrument_id: { exchange: 'NSE', symbol: 'TCS' },
    side: 'long',
    quantity: 5,
    avg_price: 4050,
    mark: 4060,
    market_value: { amount: 20_30_00, currency: 'INR' },
    realized_pnl: { amount: 0, currency: 'INR' },
    unrealized_pnl: { amount: 500, currency: 'INR' },
    product: 'intraday',
  },
];

const TRADES: Trade[] = [
  {
    order_id: 'ord-9',
    instrument_id: { exchange: 'NSE', symbol: 'INFY' },
    side: 'buy',
    quantity: 10,
    price: 1550,
    costs: { amount: 30, currency: 'INR' },
    ts_event: { iso: '2026-10-19T03:59:59Z', unix_nanos: '1760846399000000000' },
    ts_init: { iso: '2026-10-19T03:59:59Z', unix_nanos: '1760846399000000000' },
  },
];

function stubbedStack(overrides: Partial<ApiClient> = {}) {
  const base = createApiClient({ baseUrl: '/api', fetchImpl: fetch });
  const client: ApiClient = {
    ...base,
    getPortfolio: vi.fn().mockResolvedValue(SNAPSHOT),
    getAccounts: vi.fn().mockResolvedValue({ accounts: ACCOUNTS }),
    getPositions: vi.fn().mockResolvedValue({ positions: POSITIONS }),
    getTrades: vi.fn().mockResolvedValue({ trades: TRADES }),
    postPositionsClose: vi.fn().mockResolvedValue({ status: 'closing' }),
    postOrder: vi.fn().mockResolvedValue({}),
    deleteOrder: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    ...overrides,
  };
  setApiClient(client);
  return client;
}

beforeEach(() => {
  useNotifications.getState().clearAll();
});

function renderPage() {
  return render(
    <QueryClientProvider client={createQueryClient({ retries: 0 })}>
      <PortfolioPage />
    </QueryClientProvider>,
  );
}

describe('PortfolioPage (Batch I slice 1)', () => {
  it('renders the snapshot totals and the three tabs once loaded', async () => {
    stubbedStack();
    renderPage();

    // KPI strip from GET /portfolio (minor units → ₹).
    expect(await screen.findByText('₹3,150.00')).toBeInTheDocument();
    expect(screen.getByText(/Owner: default/)).toBeInTheDocument();
    // Tabs exist.
    for (const label of ['Accounts', 'Positions', 'Trade History']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
  });

  it('lists accounts and their holdings balances in the Accounts tab', async () => {
    stubbedStack();
    renderPage();

    // Default tab is Accounts — BalancesTable gets the accounts straight from the hook.
    expect(await screen.findByText('Paper Main')).toBeInTheDocument();
    expect(screen.getByText('₹2,500.00')).toBeInTheDocument(); // cash
    // Holdings are behind an expand toggle; expanding shows the instrument row.
    fireEvent.click(screen.getByRole('button', { name: /Paper Main/i }));
    expect(await screen.findByText('RELIANCE')).toBeInTheDocument();
  });

  it('closes a position through the ClosePositionModal and the /positions/close endpoint', async () => {
    const client = stubbedStack();
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Positions' }));
    expect(await screen.findByText('TCS · NSE')).toBeInTheDocument();

    // Row's close button opens Batch G's ClosePositionModal for that position.
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(
      await screen.findByRole('dialog', { name: /Close Position/i }),
    ).toBeInTheDocument();

    // Confirm fires the (bodyless, close-all) POST and refreshes portfolio state.
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(client.postPositionsClose).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(client.getPositions).toHaveBeenCalledTimes(2),
    );
    // The feature layer owns the toast — a close request lands in notifications.
    await waitFor(() => expect(useNotifications.getState().rows.length).toBeGreaterThan(0));
    // Modal is gone after confirming.
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Close Position/i })).not.toBeInTheDocument(),
    );
  });

  it('shows fills in the Trade History tab', async () => {
    stubbedStack();
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Trade History' }));
    expect(await screen.findByText('INFY · NSE')).toBeInTheDocument();
  });
});
