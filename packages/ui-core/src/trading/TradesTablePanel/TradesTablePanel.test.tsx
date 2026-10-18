import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { TradesTablePanel } from './TradesTablePanel';
import type { Trade } from './TradesTablePanel';

// jsdom has no ResizeObserver and reports 0-size elements; @tanstack/react-virtual needs both
// to compute which rows are "visible" at all. Stub them locally (scoped to this file only, not
// the shared test setup) so every fixture row actually renders instead of being virtualized away.
// Same pattern as OrdersTable.test.tsx / PositionsTable.test.tsx.
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

const buyTrade: Trade = {
  order_id: 'O-1',
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'buy',
  quantity: 10,
  price: 2500,
  costs: { amount: 0, currency: 'INR' },
  ts_event: { iso: '2026-01-01T09:15:00.000Z', unix_nanos: '1767257700000000000' },
};

const sellTrade: Trade = {
  order_id: 'O-2',
  instrument_id: { exchange: 'NSE', symbol: 'TCS' },
  side: 'sell',
  quantity: 5,
  price: 3500,
  costs: { amount: 1250, currency: 'INR' },
  ts_event: { iso: '2026-01-01T10:30:00.000Z', unix_nanos: '1767261800000000000' },
};

const rows: Trade[] = [buyTrade, sellTrade];

// `order_id` isn't one of this table's rendered columns (instrument, side, quantity, price,
// notional, costs, timestamp per the task brief), so rows are located by their (unique in this
// fixture) instrument label instead.
function getRowByInstrument(label: string) {
  const cell = screen.getByText(label);
  const row = cell.closest('tr');
  if (!row) throw new Error(`row for ${label} not found`);
  return row;
}

describe('TradesTablePanel', () => {
  it('renders a default label and every trade row', () => {
    render(<TradesTablePanel rows={rows} />);
    expect(screen.getByText('Trades')).toBeInTheDocument();
    expect(screen.getByText('RELIANCE · NSE')).toBeInTheDocument();
    expect(screen.getByText('TCS · NSE')).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<TradesTablePanel rows={rows} label="Fills" />);
    expect(screen.getByText('Fills')).toBeInTheDocument();
  });

  it('renders the instrument for each row', () => {
    render(<TradesTablePanel rows={rows} />);
    expect(within(getRowByInstrument('RELIANCE · NSE')).getByText('RELIANCE · NSE')).toBeInTheDocument();
    expect(within(getRowByInstrument('TCS · NSE')).getByText('TCS · NSE')).toBeInTheDocument();
  });

  it('shows a side badge for buy and sell', () => {
    render(<TradesTablePanel rows={rows} />);
    expect(within(getRowByInstrument('RELIANCE · NSE')).getByText('BUY')).toBeInTheDocument();
    expect(within(getRowByInstrument('TCS · NSE')).getByText('SELL')).toBeInTheDocument();
  });

  it('derives notional as quantity * price', () => {
    render(<TradesTablePanel rows={rows} />);
    // 10 * 2500 = 25000
    expect(within(getRowByInstrument('RELIANCE · NSE')).getByText('25000.00')).toBeInTheDocument();
    // 5 * 3500 = 17500
    expect(within(getRowByInstrument('TCS · NSE')).getByText('17500.00')).toBeInTheDocument();
  });

  it('formats zero and non-zero costs as money', () => {
    render(<TradesTablePanel rows={rows} />);
    expect(within(getRowByInstrument('RELIANCE · NSE')).getByText('0.00 INR')).toBeInTheDocument();
    expect(within(getRowByInstrument('TCS · NSE')).getByText('12.50 INR')).toBeInTheDocument();
  });

  it('renders the fill timestamp', () => {
    render(<TradesTablePanel rows={rows} />);
    expect(
      within(getRowByInstrument('RELIANCE · NSE')).getByText('2026-01-01T09:15:00.000Z'),
    ).toBeInTheDocument();
  });

  it('shows an empty message when there are no trades', () => {
    render(<TradesTablePanel rows={[]} />);
    expect(screen.getByText(/no trades/i)).toBeInTheDocument();
  });

  it('calls onRemove when removeable and the remove icon is clicked', () => {
    const onRemove = vi.fn();
    render(<TradesTablePanel rows={rows} removeable onRemove={onRemove} />);
    screen.getByLabelText('Remove panel').click();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders header slot content', () => {
    render(<TradesTablePanel rows={rows} headerComponents={<span>Market Filter</span>} />);
    expect(screen.getByText('Market Filter')).toBeInTheDocument();
  });
});
