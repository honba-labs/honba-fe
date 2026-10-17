import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { PositionsTablePanel } from './PositionsTablePanel';
import type { PositionRow } from '../PositionsTable';

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

const rows: PositionRow[] = [
  {
    instrument_id: { exchange: 'NSE', symbol: 'RELIANCE' },
    side: 'long',
    quantity: 10,
    avg_price: 2500,
    realized_pnl: { amount: 0, currency: 'INR' },
  },
];

describe('PositionsTablePanel', () => {
  it('renders a default label and the positions table content', () => {
    render(<PositionsTablePanel rows={rows} />);
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText(/RELIANCE/)).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<PositionsTablePanel rows={rows} label="Open Positions" />);
    expect(screen.getByText('Open Positions')).toBeInTheDocument();
  });

  it('calls onRemove when removeable and the remove icon is clicked', () => {
    const onRemove = vi.fn();
    render(<PositionsTablePanel rows={rows} removeable onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove panel'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders header slot content', () => {
    render(<PositionsTablePanel rows={rows} headerComponents={<span>Filter</span>} />);
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('forwards onClose through to the underlying table', () => {
    const onClose = vi.fn();
    render(<PositionsTablePanel rows={rows} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledWith({ exchange: 'NSE', symbol: 'RELIANCE' });
  });
});
