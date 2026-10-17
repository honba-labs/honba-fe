import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { BalancesTablePanel } from './BalancesTablePanel';
import type { PortfolioAccount } from '../BalancesTable';

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

const rows: PortfolioAccount[] = [
  {
    id: 'acc-1',
    name: 'Zerodha Main',
    broker: 'zerodha',
    mode: 'live',
    currency: 'INR',
    cash: { amount: 1000000, currency: 'INR' },
    equity: { amount: 1000000, currency: 'INR' },
    leverage: 1,
    realized_pnl: { amount: 0, currency: 'INR' },
    unrealized_pnl: { amount: 0, currency: 'INR' },
    holdings: [],
  },
];

describe('BalancesTablePanel', () => {
  it('renders a default label and the balances table content', () => {
    render(<BalancesTablePanel rows={rows} />);
    expect(screen.getByText('Balances')).toBeInTheDocument();
    expect(screen.getByText('Zerodha Main')).toBeInTheDocument();
  });

  it('accepts a custom label', () => {
    render(<BalancesTablePanel rows={rows} label="Accounts" />);
    expect(screen.getByText('Accounts')).toBeInTheDocument();
  });

  it('calls onRemove when removeable and the remove icon is clicked', () => {
    const onRemove = vi.fn();
    render(<BalancesTablePanel rows={rows} removeable onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove panel'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders header slot content', () => {
    render(<BalancesTablePanel rows={rows} headerComponents={<span>Filter</span>} />);
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });
});
