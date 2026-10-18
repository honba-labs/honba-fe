import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StrategyTradesTable } from './StrategyTradesTable';

// Same jsdom tolerances as OrdersTable.test.tsx: stub ResizeObserver + element heights so
// @tanstack/react-virtual renders all fixture rows instead of virtualizing them away.
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

const rows = [
  {
    id: '1',
    entryAt: '2026-10-16T09:31:12Z',
    closedAt: '2026-10-16T10:02:44Z',
    entryPrice: 2971.15,
    closingPrice: 2985.55,
    amount: 50,
    realizedPnl: 7200,
    side: 'long' as const,
    orderId: 'ORD-171',
    orderType: 'market',
  },
  {
    id: '2',
    entryAt: '2026-10-16T11:15:00Z',
    entryPrice: 4102.5,
    closingPrice: null,
    amount: -120,
    realizedPnl: -980,
    side: 'short' as const,
    orderId: 'ORD-188',
    orderType: 'limit',
  },
];

describe('StrategyTradesTable', () => {
  it('renders one row per closed round trip, with column headers', () => {
    render(<StrategyTradesTable rows={rows} />);
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('+7,200')).toBeInTheDocument();
    expect(screen.getByText('-980')).toBeInTheDocument();
  });

  it('renders open trades (no closing price/time) as dashes, not zero', () => {
    render(<StrategyTradesTable rows={rows} />);
    // Trade #2 is still open: closedAt/closingPrice render as em-dashes.
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('colors P&L by sign', () => {
    render(<StrategyTradesTable rows={rows} />);
    expect(screen.getByText('+7,200').className).toMatch(/positive/);
    expect(screen.getByText('-980').className).toMatch(/negative/);
  });

  it('expands a trade into a detail row with the underlying order info, and collapses it', () => {
    render(<StrategyTradesTable rows={rows} height={200} />);
    expect(screen.queryByText('Order: ORD-171')).not.toBeInTheDocument();

    // Two rows → two expand buttons; the fixture row #1 that owns ORD-171 comes first.
    fireEvent.click(screen.getAllByRole('button', { name: 'Expand trade' })[0]);
    expect(screen.getByText('Order: ORD-171')).toBeInTheDocument();
    expect(screen.getByText('Type: market')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Collapse trade' })[0]);
    expect(screen.queryByText('Order: ORD-171')).not.toBeInTheDocument();
  });

  it('renders the empty message without a table', () => {
    render(<StrategyTradesTable rows={[]} />);
    expect(screen.getByText('No trades')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expand trade' })).not.toBeInTheDocument();
  });
});
