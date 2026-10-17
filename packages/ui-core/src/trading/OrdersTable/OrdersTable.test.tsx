import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

import { OrdersTable } from './OrdersTable';
import type { Order } from './OrdersTable';

// jsdom has no ResizeObserver and reports 0-size elements; @tanstack/react-virtual needs both
// to compute which rows are "visible" at all. Stub them locally (scoped to this file only, not
// the shared test setup) so every fixture row actually renders instead of being virtualized away.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    value: 600,
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    value: 600,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const instrumentA = { exchange: 'NSE', symbol: 'RELIANCE' };
const instrumentB = { exchange: 'NSE', symbol: 'TCS' };
const instrumentC = { exchange: 'NSE', symbol: 'INFY' };
const instrumentD = { exchange: 'BSE', symbol: 'WIPRO' };
const instrumentE = { exchange: 'NSE', symbol: 'HDFCBANK' };

const rows: Order[] = [
  {
    order_id: 'O-1',
    instrument_id: instrumentA,
    side: 'buy',
    order_type: 'market',
    status: 'accepted',
    quantity: 10,
  },
  {
    order_id: 'O-2',
    instrument_id: instrumentB,
    side: 'sell',
    order_type: 'limit',
    status: 'partially_filled',
    quantity: 5,
    filled_qty: 2,
    price: 3500,
    avg_fill_price: 3498,
  },
  {
    order_id: 'O-3',
    instrument_id: instrumentC,
    side: 'buy',
    order_type: 'stop_market',
    status: 'submitted',
    quantity: 20,
    trigger_price: 1500,
  },
  {
    order_id: 'O-4',
    instrument_id: instrumentD,
    side: 'sell',
    order_type: 'stop_limit',
    status: 'filled',
    quantity: 15,
    filled_qty: 15,
    price: 450,
    trigger_price: 455,
    avg_fill_price: 449.8,
    filled_at: 1700000000000,
  },
  {
    order_id: 'O-5',
    instrument_id: instrumentE,
    side: 'buy',
    order_type: 'trailing_stop',
    status: 'cancelled',
    quantity: 8,
    trail_percent: 2,
  },
  {
    order_id: 'O-6',
    instrument_id: instrumentA,
    side: 'buy',
    order_type: 'limit',
    status: 'rejected',
    quantity: 3,
    price: 100,
  },
  {
    order_id: 'O-7',
    instrument_id: instrumentB,
    side: 'sell',
    order_type: 'market',
    status: 'expired',
    quantity: 7,
  },
  {
    order_id: 'O-8',
    instrument_id: instrumentC,
    side: 'buy',
    order_type: 'limit',
    status: 'accepted',
    quantity: 4,
    price: 200,
    cancel_requested: true,
  },
];

function getRowByOrderId(orderId: string) {
  const cell = screen.getByText(orderId);
  const row = cell.closest('tr');
  if (!row) throw new Error(`row for ${orderId} not found`);
  return row;
}

describe('OrdersTable', () => {
  it('renders a type badge for each order_type', () => {
    render(<OrdersTable rows={rows} statusFilter="all" />);

    expect(within(getRowByOrderId('O-1')).getByText('Market')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-2')).getByText('Limit')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-3')).getByText('Stop')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-4')).getByText('Stop Limit')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-5')).getByText('Trailing Stop')).toBeInTheDocument();
  });

  it('renders a readable status label for each row', () => {
    render(<OrdersTable rows={rows} statusFilter="all" />);

    expect(within(getRowByOrderId('O-1')).getByText('Accepted')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-2')).getByText('Partially Filled')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-4')).getByText('Filled')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-5')).getByText('Cancelled')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-6')).getByText('Rejected')).toBeInTheDocument();
    expect(within(getRowByOrderId('O-7')).getByText('Expired')).toBeInTheDocument();
  });

  it('shows a cancel action only for working orders, not for terminal ones', () => {
    render(<OrdersTable rows={rows} statusFilter="all" onCancel={() => {}} />);

    // working: accepted, partially_filled, submitted -> O-1, O-2, O-3 (O-8 has cancel_requested)
    expect(within(getRowByOrderId('O-1')).getByRole('button', { name: /cancel/i })).toBeEnabled();
    expect(within(getRowByOrderId('O-2')).getByRole('button', { name: /cancel/i })).toBeEnabled();
    expect(within(getRowByOrderId('O-3')).getByRole('button', { name: /cancel/i })).toBeEnabled();

    // terminal statuses: no cancel control at all
    for (const orderId of ['O-4', 'O-5', 'O-6', 'O-7']) {
      expect(within(getRowByOrderId(orderId)).queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    }
  });

  it('disables the cancel control once a cancel has already been requested', () => {
    render(<OrdersTable rows={rows} statusFilter="all" onCancel={() => {}} />);

    expect(within(getRowByOrderId('O-8')).getByRole('button', { name: /cancelling/i })).toBeDisabled();
  });

  it('calls onCancel with the order id when cancel is clicked, and never for a disabled control', () => {
    const onCancel = vi.fn();
    render(<OrdersTable rows={rows} statusFilter="all" onCancel={onCancel} />);

    fireEvent.click(within(getRowByOrderId('O-2')).getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledWith('O-2');
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(within(getRowByOrderId('O-8')).getByRole('button', { name: /cancelling/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render a cancel control for any row when onCancel is omitted', () => {
    render(<OrdersTable rows={rows} statusFilter="all" />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('defaults to showing only working (open) orders', () => {
    render(<OrdersTable rows={rows} />);

    expect(screen.getByText('O-1')).toBeInTheDocument();
    expect(screen.getByText('O-2')).toBeInTheDocument();
    expect(screen.getByText('O-3')).toBeInTheDocument();
    expect(screen.getByText('O-8')).toBeInTheDocument();

    expect(screen.queryByText('O-4')).not.toBeInTheDocument();
    expect(screen.queryByText('O-5')).not.toBeInTheDocument();
    expect(screen.queryByText('O-6')).not.toBeInTheDocument();
    expect(screen.queryByText('O-7')).not.toBeInTheDocument();
  });

  it('shows only closed/terminal orders for statusFilter="history"', () => {
    render(<OrdersTable rows={rows} statusFilter="history" />);

    expect(screen.getByText('O-4')).toBeInTheDocument();
    expect(screen.getByText('O-5')).toBeInTheDocument();
    expect(screen.getByText('O-6')).toBeInTheDocument();
    expect(screen.getByText('O-7')).toBeInTheDocument();

    expect(screen.queryByText('O-1')).not.toBeInTheDocument();
    expect(screen.queryByText('O-2')).not.toBeInTheDocument();
    expect(screen.queryByText('O-3')).not.toBeInTheDocument();
    expect(screen.queryByText('O-8')).not.toBeInTheDocument();
  });

  it('shows an empty message when no rows match the filter', () => {
    render(<OrdersTable rows={[]} />);
    expect(screen.getByText(/no orders/i)).toBeInTheDocument();
  });
});
