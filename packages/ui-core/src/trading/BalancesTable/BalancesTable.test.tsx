import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { BalancesTable } from './BalancesTable';
import type { PortfolioAccount } from './BalancesTable';

// jsdom has no ResizeObserver and reports 0-size elements; @tanstack/react-virtual needs both
// to compute which rows are "visible" at all. Stub them locally, same pattern as OrdersTable and
// PositionsTable's tests.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const holdingA = {
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  quantity: 100,
  avg_price: 2500,
  mark: 2550,
  market_value: { amount: 25500000, currency: 'INR' },
  realized_pnl: { amount: 0, currency: 'INR' },
  unrealized_pnl: { amount: 500000, currency: 'INR' },
  tags: ['largecap'],
};

const holdingB = {
  instrument_id: { exchange: 'NSE', symbol: 'TCS' },
  quantity: 20,
  avg_price: 3600,
  mark: 3550,
  market_value: { amount: 7100000, currency: 'INR' },
  realized_pnl: { amount: 0, currency: 'INR' },
  unrealized_pnl: { amount: -100000, currency: 'INR' },
  tags: [],
};

const accounts: PortfolioAccount[] = [
  // Broker-sourced account with holdings and greeks.
  {
    id: 'acc-1',
    name: 'Zerodha Main',
    broker: 'zerodha',
    mode: 'live',
    currency: 'INR',
    cash: { amount: 1000000, currency: 'INR' },
    equity: { amount: 3850000, currency: 'INR' },
    leverage: 1,
    realized_pnl: { amount: 0, currency: 'INR' },
    unrealized_pnl: { amount: 400000, currency: 'INR' },
    holdings: [holdingA, holdingB],
    greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
  },
  // Ledger (sandbox) account with no holdings and no greeks.
  {
    id: 'acc-2',
    name: 'Sandbox',
    broker: null,
    mode: 'sandbox',
    currency: 'INR',
    cash: { amount: 5000000, currency: 'INR' },
    equity: { amount: 5000000, currency: 'INR' },
    leverage: 1,
    realized_pnl: { amount: 0, currency: 'INR' },
    unrealized_pnl: { amount: 0, currency: 'INR' },
    holdings: [],
    greeks: null,
  },
];

function getRowByAccountName(name: string) {
  const cell = screen.getByText(name);
  const row = cell.closest('tr');
  if (!row) throw new Error(`row for ${name} not found`);
  return row;
}

describe('BalancesTable', () => {
  it('renders one row per account with broker, currency, cash, equity and leverage', () => {
    render(<BalancesTable rows={accounts} />);

    const row1 = within(getRowByAccountName('Zerodha Main'));
    expect(row1.getByText('zerodha')).toBeInTheDocument();
    expect(row1.getByText(/10000\.00 INR/)).toBeInTheDocument();
    expect(row1.getByText(/38500\.00 INR/)).toBeInTheDocument();

    const row2 = within(getRowByAccountName('Sandbox'));
    expect(row2.getByText('-')).toBeInTheDocument();
  });

  it('does not render a flat per-instrument balance row -- balances are per-account', () => {
    render(<BalancesTable rows={accounts} />);
    // instrument symbols should not appear until a row is expanded
    expect(screen.queryByText('RELIANCE')).not.toBeInTheDocument();
  });

  it('expands an account row to reveal its holdings, and collapses again on second click', () => {
    render(<BalancesTable rows={accounts} />);

    // Re-query the toggle after each click (rather than reusing one stale handle) -- this
    // table's rows live inside a virtualizer, which may swap the underlying DOM node when its
    // display-row list changes shape (an account row vs. its holdings block are different row
    // "kinds"), same as a real pointer click always targets whatever is currently rendered.
    fireEvent.click(within(getRowByAccountName('Zerodha Main')).getByRole('button', { name: /expand/i }));

    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
    expect(screen.getByText('TCS')).toBeInTheDocument();

    fireEvent.click(within(getRowByAccountName('Zerodha Main')).getByRole('button', { name: /collapse/i }));
    expect(screen.queryByText('RELIANCE')).not.toBeInTheDocument();
  });

  it('disables the expand control for an account with no holdings', () => {
    render(<BalancesTable rows={accounts} />);
    const toggle = within(getRowByAccountName('Sandbox')).getByRole('button', { name: /expand/i });
    expect(toggle).toBeDisabled();
  });

  it('shows an empty message when there are no accounts', () => {
    render(<BalancesTable rows={[]} />);
    expect(screen.getByText(/no accounts/i)).toBeInTheDocument();
  });
});
