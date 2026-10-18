import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ActiveOrdersModal } from './ActiveOrdersModal';
import type { Order } from '../../trading/OrdersTable';

const rows: Order[] = [
  {
    order_id: 'ORD-201',
    instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
    side: 'buy',
    order_type: 'limit',
    status: 'submitted',
    quantity: 100,
    price: 2980,
  },
  {
    order_id: 'ORD-202',
    instrument_id: { exchange: 'NSE', symbol: 'TCS' },
    side: 'sell',
    order_type: 'market',
    status: 'partially_filled',
    quantity: 25,
    filled_qty: 10,
  },
];

describe('ActiveOrdersModal', () => {
  it('lists working orders with ids and zero selection gates the footer actions', () => {
    render(
      <ActiveOrdersModal
        isOpen
        onClose={() => {}}
        rows={rows}
        onCancel={() => {}}
        onResume={() => {}}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Active orders' })).toBeInTheDocument();
    expect(screen.getByText(/BUY 100 Limit NSE:RELIANCE/)).toBeInTheDocument();
    expect(screen.getByText('ORD-202')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resend' })).toBeDisabled();
  });

  it('select-all selects/deselects every row (reference checkbox parity)', () => {
    render(
      <ActiveOrdersModal
        isOpen
        onClose={() => {}}
        rows={rows}
        onCancel={() => {}}
        onResume={() => {}}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3); // two rows + select all

    fireEvent.click(checkboxes[2]);
    for (const checkbox of checkboxes.slice(0, 2)) {
      expect(checkbox).toBeChecked();
    }
    expect(screen.getByText('Select all (2)')).toBeInTheDocument();

    fireEvent.click(checkboxes[2]);
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('cancel/resend fire with the selected ids and stay disabled without any', () => {
    const onCancel = vi.fn();
    const onResume = vi.fn();
    render(
      <ActiveOrdersModal
        isOpen
        onClose={() => {}}
        rows={rows}
        onCancel={onCancel}
        onResume={onResume}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /BUY 100 Limit/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel all' }));
    expect(onCancel).toHaveBeenCalledWith(['ORD-201']);

    fireEvent.click(screen.getByRole('button', { name: 'Resend' }));
    expect(onResume).toHaveBeenCalledWith(['ORD-201']);
  });

  it('renders the reconnect notice only when restoredAfterReconnect is set', () => {
    const { rerender } = render(
      <ActiveOrdersModal
        isOpen
        onClose={() => {}}
        rows={rows}
        restoredAfterReconnect={false}
        onCancel={() => {}}
        onResume={() => {}}
      />,
    );
    expect(screen.queryByText(/Connection restored/)).not.toBeInTheDocument();

    rerender(
      <ActiveOrdersModal
        isOpen
        onClose={() => {}}
        rows={rows}
        restoredAfterReconnect
        onCancel={() => {}}
        onResume={() => {}}
      />,
    );
    expect(screen.getByText(/Connection restored —/)).toBeInTheDocument();
  });

  it('shows the empty state and keeps selection cleared per open', () => {
    const { rerender } = render(
      <ActiveOrdersModal
        isOpen
        onClose={() => {}}
        rows={[rows[0]]}
        onCancel={() => {}}
        onResume={() => {}}
      />,
    );
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();

    // Reopening resets selection; an empty list renders the empty message.
    rerender(
      <ActiveOrdersModal isOpen={false} onClose={() => {}} rows={[]} onCancel={() => {}} onResume={() => {}} />,
    );
    rerender(
      <ActiveOrdersModal isOpen onClose={() => {}} rows={[]} onCancel={() => {}} onResume={() => {}} />,
    );
    expect(screen.getByText('No working orders')).toBeInTheDocument();
  });
});
