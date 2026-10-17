import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { OrderBookPanel } from './OrderBookPanel';

const bids = [{ price: 101.5, size: 10 }];
const asks = [{ price: 102.0, size: 8 }];

describe('OrderBookPanel', () => {
  it('renders the panel label and the order book rows', () => {
    render(<OrderBookPanel bids={bids} asks={asks} />);
    expect(screen.getByText('Order Book')).toBeInTheDocument();
    expect(screen.getByText('101.50')).toBeInTheDocument();
    expect(screen.getByText('102.00')).toBeInTheDocument();
  });

  it('renders a header slot, e.g. a market selector', () => {
    render(
      <OrderBookPanel bids={bids} asks={asks} headerComponents={<span>RELIANCE</span>} />,
    );
    expect(screen.getByText('RELIANCE')).toBeInTheDocument();
  });

  it('calls onRemove when removeable and the remove icon is clicked', () => {
    const onRemove = vi.fn();
    render(<OrderBookPanel bids={bids} asks={asks} removeable onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove panel'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
