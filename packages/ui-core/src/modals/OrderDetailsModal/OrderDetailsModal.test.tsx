import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { OrderDetailsModal } from './OrderDetailsModal';
import type { Trade } from '../../trading/TradesTablePanel';

const order = {
  order_id: 'ORD-171',
  instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
  side: 'buy' as const,
  order_type: 'limit' as const,
  status: 'partially_filled' as const,
  quantity: 100,
  filled_qty: 50,
  avg_fill_price: 2978.4,
  time_in_force: 'day' as const,
};

const fills: Trade[] = [
  {
    order_id: 'ORD-171',
    instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
    side: 'buy',
    quantity: 50,
    price: 2978.4,
    costs: { amount: 1489.2, currency: 'INR' },
    ts_event: { iso: '2026-10-16T09:31:12Z', unix_nanos: '1760609472000000000' },
    ts_init: { iso: '2026-10-16T09:31:12Z', unix_nanos: '1760609472000000000' },
  },
];

describe('OrderDetailsModal', () => {
  it('shows the order fact grid (id, instrument, fill ratio, status, TIF)', () => {
    render(
      <OrderDetailsModal isOpen onClose={() => {}} order={order} fills={fills} />,
    );
    expect(screen.getByRole('dialog', { name: 'Order ORD-171' })).toBeInTheDocument();
    expect(screen.getByText('NSE:RELIANCE')).toBeInTheDocument();
    expect(screen.getByText('50/100 filled (50%)')).toBeInTheDocument();
    expect(screen.getByText('Partially Filled')).toBeInTheDocument();
    // No price/trigger on this fixture → the fallback dash renders in the price cell.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('lists the fills with costs formatted and the fill timestamp', () => {
    render(
      <OrderDetailsModal isOpen onClose={() => {}} order={{ ...order, price: 2980 }} fills={fills} />,
    );
    expect(screen.getByText('Fills (1)')).toBeInTheDocument();
    // 'BUY' also appears in the fact grid (side) — assert inside the fills table.
    const fillRow = document.querySelector('.hb-order-details-modal__fills-table td')!;
    expect(fillRow.textContent).toContain('BUY');
    // formatMoney renders Money in minor units: 1489.2 paise → "14.89 INR".
    expect(screen.getByText('14.89 INR')).toBeInTheDocument();
    expect(screen.getByText('2026-10-16 09:31:12')).toBeInTheDocument();
  });

  it('shows the no-fills empty state', () => {
    render(<OrderDetailsModal isOpen onClose={() => {}} order={order} fills={[]} />);
    expect(screen.getByText('Fills (0)')).toBeInTheDocument();
    expect(screen.getByText('No fills yet')).toBeInTheDocument();
  });

  it('export button appears only with onExport and receives the fills', () => {
    const onExport = vi.fn();
    const { rerender } = render(
      <OrderDetailsModal isOpen onClose={() => {}} order={order} fills={fills} onExport={onExport} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Export fills (JSON)' }));
    expect(onExport).toHaveBeenCalledWith(fills);

    rerender(<OrderDetailsModal isOpen onClose={() => {}} order={order} fills={fills} />);
    expect(screen.queryByRole('button', { name: 'Export fills (JSON)' })).not.toBeInTheDocument();
  });
});
