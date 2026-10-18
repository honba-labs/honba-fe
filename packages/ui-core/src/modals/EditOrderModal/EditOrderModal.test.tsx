import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { EditOrderModal } from './EditOrderModal';
import type { Order } from '../../trading/OrdersTable';

const baseOrder: Order = {
  order_id: 'ORD-182',
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'buy',
  order_type: 'limit',
  status: 'submitted',
  quantity: 100,
  price: 2980,
  time_in_force: 'day',
};

const marketOrder: Order = {
  ...baseOrder,
  order_id: 'ORD-183',
  order_type: 'market',
  price: null,
};

describe('EditOrderModal', () => {
  it('prefills quantity/price from the order and shows its context line', () => {
    render(<EditOrderModal isOpen onClose={() => {}} order={baseOrder} onSubmit={() => {}} />);
    const inputs = screen.getAllByRole('spinbutton');
    expect((inputs[0] as HTMLInputElement).value).toBe('100');
    expect((inputs[1] as HTMLInputElement).value).toBe('2980');
    expect(screen.getByText(/BUY 100 Limit/)).toBeInTheDocument();
    expect(screen.getByText(/NSE:RELIANCE/)).toBeInTheDocument();
  });

  it('disables update until a change is made, submits the patch with the amended fields', () => {
    const onSubmit = vi.fn();
    render(<EditOrderModal isOpen onClose={() => {}} order={baseOrder} onSubmit={onSubmit} />);

    const update = screen.getByRole('button', { name: 'Update order' });
    expect(update).toBeDisabled();

    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '150' } });
    expect(update).toBeEnabled();
    fireEvent.click(update);
    expect(onSubmit).toHaveBeenCalledWith({ order_id: 'ORD-182', quantity: 150, price: 2980 });
  });

  it('validates quantity client-side; caller errors render as a red attention bar', () => {
    render(
      <EditOrderModal
        isOpen
        onClose={() => {}}
        order={baseOrder}
        onSubmit={() => {}}
        error="Broker rejected the amend (insufficient margin)"
      />,
    );
    expect(screen.getByText('Broker rejected the amend (insufficient margin)')).toBeInTheDocument();

    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '-5' } });
    expect(screen.getByText('Quantity must be a positive number')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update order' })).toBeDisabled();
  });

  it('market orders need no price; blank price is accepted, negative price is not', () => {
    const onSubmit = vi.fn();
    render(<EditOrderModal isOpen onClose={() => {}} order={marketOrder} onSubmit={onSubmit} />);

    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update order' }));
    expect(onSubmit).toHaveBeenCalledWith({ order_id: 'ORD-183', quantity: 120 });

    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '-1' } });
    expect(screen.getByText('Price must be a positive number')).toBeInTheDocument();
  });

  it('renders nothing without an order (host keeps the modal while it closes)', () => {
    const { container } = render(
      <EditOrderModal isOpen onClose={() => {}} order={null} onSubmit={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
