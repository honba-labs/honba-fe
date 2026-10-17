import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OrderBook } from './OrderBook';
import type { PriceLevel } from './OrderBook.types';

const bids: PriceLevel[] = [
  { price: 101.5, size: 10 },
  { price: 101.0, size: 5 },
];
const asks: PriceLevel[] = [
  { price: 102.0, size: 8 },
  { price: 102.5, size: 12 },
];

describe('OrderBook', () => {
  it('renders bid and ask rows with formatted prices', () => {
    render(<OrderBook bids={bids} asks={asks} />);
    expect(screen.getByText('101.50')).toBeInTheDocument();
    expect(screen.getByText('101.00')).toBeInTheDocument();
    expect(screen.getByText('102.00')).toBeInTheDocument();
    expect(screen.getByText('102.50')).toBeInTheDocument();
  });

  it('derives a running total when one is not supplied', () => {
    render(<OrderBook bids={bids} asks={asks} sizeDecimals={0} />);
    // bids: 10, then 10+5=15 cumulative
    expect(screen.getByText('15')).toBeInTheDocument();
    // asks: 8, then 8+12=20 cumulative
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('uses a supplied total instead of recomputing one', () => {
    render(
      <OrderBook
        bids={[{ price: 101.5, size: 10, total: 999 }]}
        asks={[]}
        sizeDecimals={0}
      />,
    );
    expect(screen.getByText('999')).toBeInTheDocument();
  });

  it('caps the rows shown per side at maxRows', () => {
    const manyBids = Array.from({ length: 20 }, (_, i) => ({ price: 100 - i, size: 1 }));
    const { container } = render(<OrderBook bids={manyBids} asks={[]} maxRows={5} />);
    expect(container.querySelectorAll('.hb-orderbook__side.bid .hb-orderbook__row')).toHaveLength(5);
  });

  it('calls onLevelClick with the level and side', () => {
    const onLevelClick = vi.fn();
    render(<OrderBook bids={bids} asks={asks} onLevelClick={onLevelClick} />);
    screen.getByText('101.50').closest('li')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(onLevelClick).toHaveBeenCalledWith(
      expect.objectContaining({ price: 101.5, size: 10 }),
      'bid',
    );
  });

  it('shows an empty placeholder when a side has no levels', () => {
    render(<OrderBook bids={[]} asks={asks} />);
    expect(screen.getByText('No orders')).toBeInTheDocument();
  });
});
