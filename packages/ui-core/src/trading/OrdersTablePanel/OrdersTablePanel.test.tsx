import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { OrdersTablePanel } from './OrdersTablePanel';
import type { Order } from '../OrdersTable';

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

const rows: Order[] = [
  {
    order_id: 'O-1',
    instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
    side: 'buy',
    order_type: 'market',
    status: 'accepted',
    quantity: 10,
  },
];

describe('OrdersTablePanel', () => {
  it('renders a default label and the orders table content', () => {
    render(<OrdersTablePanel rows={rows} />);
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('O-1')).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<OrdersTablePanel rows={rows} label="Open Orders" />);
    expect(screen.getByText('Open Orders')).toBeInTheDocument();
  });

  it('calls onRemove when removeable and the remove icon is clicked', () => {
    const onRemove = vi.fn();
    render(<OrdersTablePanel rows={rows} removeable onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove panel'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders header slot content', () => {
    render(<OrdersTablePanel rows={rows} headerComponents={<span>Filter</span>} />);
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('forwards onCancel through to the underlying table', () => {
    const onCancel = vi.fn();
    render(<OrdersTablePanel rows={rows} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledWith('O-1');
  });
});
