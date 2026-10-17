import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { PositionsTable } from './PositionsTable';
import type { PositionRow } from './PositionsTable';

// jsdom has no ResizeObserver and reports 0-size elements; @tanstack/react-virtual needs both
// to compute which rows are "visible" at all. Stub them locally (scoped to this file only, not
// the shared test setup) so every fixture row actually renders instead of being virtualized away.
// Same pattern as OrdersTable.test.tsx.
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

const instrumentA = { exchange: 'NSE', symbol: 'RELIANCE' };
const instrumentB = { exchange: 'NSE', symbol: 'TCS' };
const instrumentC = { exchange: 'NSE', symbol: 'INFY' };
const instrumentD = { exchange: 'BSE', symbol: 'WIPRO' };

const rows: PositionRow[] = [
  // Long position, valued (the real GET /portfolio/positions shape: PortfolioPosition).
  {
    instrument_id: instrumentA,
    side: 'long',
    quantity: 100,
    avg_price: 2500,
    realized_pnl: { amount: 0, currency: 'INR' },
    mark: 2550,
    market_value: { amount: 25500000, currency: 'INR' },
    unrealized_pnl: { amount: 500000, currency: 'INR' },
    product: 'delivery',
  },
  // Short position, valued, with a loss.
  {
    instrument_id: instrumentB,
    side: 'short',
    quantity: 50,
    avg_price: 3600,
    realized_pnl: { amount: 0, currency: 'INR' },
    mark: 3650,
    market_value: { amount: 18250000, currency: 'INR' },
    unrealized_pnl: { amount: -250000, currency: 'INR' },
    product: 'intraday',
  },
  // Flat position (quantity 0) with non-zero realized PnL from a round trip.
  {
    instrument_id: instrumentC,
    side: 'long',
    quantity: 0,
    avg_price: 0,
    realized_pnl: { amount: 120000, currency: 'INR' },
  },
  // Bare `Position` shape (no mark/market_value/unrealized_pnl/product) -- what
  // `POST /positions/close` returns, or a plain PositionsResponse -- must still render.
  {
    instrument_id: instrumentD,
    side: 'long',
    quantity: 10,
    avg_price: 450,
    realized_pnl: { amount: 0, currency: 'INR' },
  },
];

function getRowBySymbol(symbol: string) {
  const cell = screen.getByText((text) => text.includes(symbol));
  const row = cell.closest('tr');
  if (!row) throw new Error(`row for ${symbol} not found`);
  return row;
}

describe('PositionsTable', () => {
  it('renders a side badge for long, short and flat positions', () => {
    render(<PositionsTable rows={rows} />);

    expect(within(getRowBySymbol('RELIANCE')).getByText('LONG')).toBeInTheDocument();
    expect(within(getRowBySymbol('TCS')).getByText('SHORT')).toBeInTheDocument();
    expect(within(getRowBySymbol('INFY')).getByText('FLAT')).toBeInTheDocument();
  });

  it('renders mark/market value/unrealized pnl when present, and a placeholder when absent', () => {
    render(<PositionsTable rows={rows} />);

    expect(within(getRowBySymbol('RELIANCE')).getByText('2550')).toBeInTheDocument();
    // Bare Position row (WIPRO) has none of the richer valuation fields.
    const wiproRow = within(getRowBySymbol('WIPRO'));
    expect(wiproRow.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('renders realized and unrealized PnL with PLNumber coloring', () => {
    render(<PositionsTable rows={rows} />);

    const relianceRow = within(getRowBySymbol('RELIANCE'));
    expect(relianceRow.getByText(/5000\.00/)).toBeInTheDocument();

    const tcsRow = within(getRowBySymbol('TCS'));
    expect(tcsRow.getByText(/2500\.00/)).toBeInTheDocument();
  });

  it('shows a close action only for non-flat positions, and never when onClose is omitted', () => {
    render(<PositionsTable rows={rows} onClose={() => {}} />);

    expect(within(getRowBySymbol('RELIANCE')).getByRole('button', { name: /close/i })).toBeEnabled();
    expect(within(getRowBySymbol('TCS')).getByRole('button', { name: /close/i })).toBeEnabled();
    expect(within(getRowBySymbol('INFY')).queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('does not render a close control for any row when onClose is omitted', () => {
    render(<PositionsTable rows={rows} />);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });

  it('calls onClose with the instrument_id when close is clicked', () => {
    const onClose = vi.fn();
    render(<PositionsTable rows={rows} onClose={onClose} />);

    fireEvent.click(within(getRowBySymbol('RELIANCE')).getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledWith(instrumentA);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an empty message when there are no rows', () => {
    render(<PositionsTable rows={[]} />);
    expect(screen.getByText(/no open positions/i)).toBeInTheDocument();
  });
});
